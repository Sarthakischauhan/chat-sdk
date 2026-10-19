"use client";

import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Popover } from "radix-ui";
import { Check, ChevronDown, Ellipsis, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, useDropdownPresence, type DropdownOrigin } from "../../motion";
import { useMessages, useModel } from "./context";
import type { RegistryModel, RegistryProvider } from "./context/types";
import { ProviderLogo } from "./provider-logo";

const THINKING_ORIGIN: DropdownOrigin = "top-right";

const providerName = (entry: RegistryProvider) => entry.name ?? entry.label;

/** 1000000 → "1M", 400000 → "400K", 131072 → "131K". */
export const formatContextWindow = (tokens: number) => {
  if (tokens >= 1_000_000) {
    // One decimal, dropping ".0": 1048576 → "1M", 1500000 → "1.5M".
    return `${Math.round(tokens / 100_000) / 10}M`;
  }
  return `${Math.round(tokens / 1000)}K`;
};

const secondaryLine = (item: RegistryModel) =>
  item.contextWindow ? `${formatContextWindow(item.contextWindow)} context window` : item.description;

type Row = { entry: RegistryProvider; item: RegistryModel; key: string };

const BadgeFor = ({ entry }: { entry: RegistryProvider }) =>
  entry.logo ? (
    <img className="chat-provider-logo" src={entry.logo} alt="" aria-hidden="true" />
  ) : (
    <ProviderLogo provider={entry.id} />
  );

/**
 * Model picker: a popover with search, provider filter chips and a list grouped by
 * provider. Arrow keys move the highlight, Enter picks, Escape closes.
 */
export const ChatSelect = () => {
  const { provider, model, registry, setProvider, getThinkingLevel, setThinkingLevel } = useModel();
  const { isSending } = useMessages();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [thinkingOpen, setThinkingOpen] = useState<string | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Stays mounted through the close tween and adds the .is-open hook.
  const menu = useDropdownPresence(open, portalContainer);

  const selectedProvider = registry.providers.find((entry) => entry.id === provider);
  const selectedModel = selectedProvider?.models.find((entry) => entry.id === model);
  const modelLabel = selectedModel?.label ?? (model || "Loading models…");

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    return registry.providers
      .filter((entry) => chips.length === 0 || chips.includes(entry.id))
      .flatMap((entry) =>
        entry.models
          .filter(
            (item) =>
              !q ||
              item.label.toLowerCase().includes(q) ||
              item.id.toLowerCase().includes(q) ||
              providerName(entry).toLowerCase().includes(q) ||
              entry.id.toLowerCase().includes(q),
          )
          .map((item) => ({ entry, item, key: `${entry.id}::${item.id}` })),
      );
  }, [registry.providers, query, chips]);

  const groups = useMemo(() => {
    const out: { entry: RegistryProvider; rows: { row: Row; index: number }[] }[] = [];
    rows.forEach((row, index) => {
      const last = out.at(-1);
      if (last && last.entry.id === row.entry.id) last.rows.push({ row, index });
      else out.push({ entry: row.entry, rows: [{ row, index }] });
    });
    return out;
  }, [rows]);

  const setRootElement = useCallback((node: HTMLDivElement | null) => {
    const found = node?.closest(".chat-root");
    setPortalContainer(found instanceof HTMLElement ? found : null);
  }, []);

  const highlight = (index: number) => {
    setActive(index);
    listRef.current
      ?.querySelector(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  };
  const pick = (row: Row | undefined) => {
    if (!row) return;
    setProvider(row.entry.id, row.item.id);
    setOpen(false);
  };
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    setThinkingOpen(null);
    if (next) {
      setQuery("");
      setChips([]);
      const current = rows.findIndex((row) => row.entry.id === provider && row.item.id === model);
      setActive(Math.max(0, current));
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!rows.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      highlight((active + step + rows.length) % rows.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      pick(rows[active]);
    }
  };
  const toggleChip = (id: string) => {
    setChips((current) => (current.includes(id) ? current.filter((chip) => chip !== id) : [...current, id]));
    setActive(0);
  };

  return (
    <div ref={setRootElement}>
      <Popover.Root open={open || menu.mounted} onOpenChange={onOpenChange}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="chat-model-trigger"
            disabled={isSending}
            aria-haspopup="listbox"
            data-state={open ? "open" : "closed"}
          >
            <span className="chat-model-selected">
              {selectedProvider && selectedModel ? <BadgeFor entry={selectedProvider} /> : null}
              <span>{modelLabel}</span>
            </span>
            <ChevronDown aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal container={portalContainer}>
          <Popover.Content
            align="start"
            side="top"
            sideOffset={6}
            collisionPadding={12}
            // The composer treats select-content as inside it, so it stays expanded.
            data-slot="select-content"
            className={cn("chat-model-content chat-model-picker", motion.dropdown, menu.className)}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              event.currentTarget instanceof HTMLElement &&
                event.currentTarget.querySelector<HTMLInputElement>("input")?.focus();
            }}
          >
            <label className="chat-model-search">
              <Search className="chat-model-search-icon" aria-hidden="true" />
              <input
                className="chat-model-search-input"
                placeholder="Search models…"
                aria-label="Search models"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={rows[active] ? `${listId}-${active}` : undefined}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
              />
            </label>
            {registry.providers.length > 1 ? (
              <div className="chat-model-chips" role="group" aria-label="Filter by provider">
                {registry.providers.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="chat-model-chip"
                    aria-pressed={chips.includes(entry.id)}
                    onClick={() => toggleChip(entry.id)}
                  >
                    {providerName(entry)}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="chat-model-list" id={listId} role="listbox" aria-label="Models" ref={listRef}>
              {rows.length === 0 ? (
                <div className="chat-model-empty">No models found</div>
              ) : (
                groups.map((group) => (
                  <div className="chat-model-group" role="group" aria-label={providerName(group.entry)} key={group.entry.id}>
                    <div className="chat-model-label" aria-hidden="true">
                      {providerName(group.entry)}
                    </div>
                    {group.rows.map(({ row, index }) => {
                      const levels = row.item.thinkingLevels;
                      const fallback = levels?.length ? (levels.includes("medium") ? "medium" : levels[0]) : undefined;
                      const level = fallback ? (getThinkingLevel(row.entry.id, row.item.id) ?? fallback) : undefined;
                      return (
                        <ModelRow
                          key={row.key}
                          id={`${listId}-${index}`}
                          index={index}
                          row={row}
                          selected={row.entry.id === provider && row.item.id === model}
                          highlighted={index === active}
                          levels={levels}
                          level={level}
                          thinkingOpen={thinkingOpen === row.key}
                          onHover={() => setActive(index)}
                          onPick={() => pick(row)}
                          onToggleThinking={() => setThinkingOpen(thinkingOpen === row.key ? null : row.key)}
                          onPickThinking={(next) => {
                            setThinkingLevel(row.entry.id, row.item.id, next);
                            setThinkingOpen(null);
                          }}
                        />
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};

const ModelRow = ({
  id,
  index,
  row,
  selected,
  highlighted,
  levels,
  level,
  thinkingOpen,
  onHover,
  onPick,
  onToggleThinking,
  onPickThinking,
}: {
  id: string;
  index: number;
  row: Row;
  selected: boolean;
  highlighted: boolean;
  levels?: string[];
  level?: string;
  thinkingOpen: boolean;
  onHover: () => void;
  onPick: () => void;
  onToggleThinking: () => void;
  onPickThinking: (level: string) => void;
}) => {
  const menu = useDropdownPresence(thinkingOpen);
  const secondary = secondaryLine(row.item);
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      data-index={index}
      data-highlighted={highlighted ? "true" : undefined}
      className="chat-model-row chat-model-item"
      onMouseMove={onHover}
      onClick={onPick}
    >
      <BadgeFor entry={row.entry} />
      <span className="chat-model-item-text">
        <span className="chat-model-item-label">{row.item.label}</span>
        {secondary ? <span className="chat-model-item-hint">{secondary}</span> : null}
      </span>
      {levels?.length && level ? (
        <>
          <button
            type="button"
            aria-label={`Thinking: ${level}`}
            className="chat-model-thinking-trigger"
            data-open={thinkingOpen ? "true" : "false"}
            onClick={(event) => {
              event.stopPropagation();
              onToggleThinking();
            }}
          >
            <Ellipsis className="chat-model-thinking-icon" />
          </button>
          {menu.mounted ? (
            <div
              className={cn("chat-model-thinking-menu", motion.dropdown, menu.className)}
              data-origin={THINKING_ORIGIN}
              onClick={(event) => event.stopPropagation()}
            >
              {levels.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="chat-model-thinking-option"
                  data-active={option === level ? "true" : "false"}
                  onClick={() => onPickThinking(option)}
                >
                  <span>{option}</span>
                  {option === level ? <Check className="chat-model-thinking-check" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
      {selected ? <Check className="chat-model-check" aria-hidden="true" /> : <span className="chat-model-check" />}
    </div>
  );
};
