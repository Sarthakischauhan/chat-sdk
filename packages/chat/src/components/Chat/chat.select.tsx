"use client";

import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectItem,
} from "../../ui/select";
import { Check, Ellipsis } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, useDropdownPresence, type DropdownOrigin } from "../../motion";
import { useMessages, useModel } from "./context";

const SELECT_ORIGIN: DropdownOrigin = "top-left";
const THINKING_ORIGIN: DropdownOrigin = "top-right";

const ProviderBadge = ({ logo, name }: { logo?: string; name: string }) => {
  if (logo) {
    return (
      <img
        className="chat-model-provider-logo"
        src={logo}
        alt=""
        aria-hidden="true"
      />
    );
  }

  return (
    <span className="chat-model-provider-logo chat-model-provider-fallback" aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
};

export const ChatSelect = () => {
  const { provider, model, registry, setProvider, getThinkingLevel, setThinkingLevel } = useModel();
  const { isSending } = useMessages();
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [thinkingOpen, setThinkingOpen] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const menu = useDropdownPresence(menuOpen, rootRef);
  const selectedValue = `${provider}::${model}`;
  const selectedProvider = registry.providers.find((entry) => entry.id === provider);
  const selectedModel = selectedProvider?.models.find((entry) => entry.id === model);
  const providerName = selectedProvider?.name ?? selectedProvider?.label ?? provider;
  const modelLabel = selectedModel?.label ?? (model || "Loading models…");
  const filteredProviders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return registry.providers;
    return registry.providers
      .map((entry) => ({
        ...entry,
        models: entry.models.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.id.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q)) ||
            entry.label.toLowerCase().includes(q),
        ),
      }))
      .filter((entry) => entry.models.length > 0);
  }, [registry.providers, query]);
  const setRootElement = useCallback((node: HTMLDivElement | null) => {
    const found = node?.closest(".chat-root");
    rootRef.current = found instanceof HTMLElement ? found : null;
    setPortalContainer(found instanceof HTMLElement ? found : null);
  }, []);

  return (
    <div ref={setRootElement}>
      <Select
        open={menuOpen || menu.mounted}
        onOpenChange={setMenuOpen}
        value={selectedValue}
        onValueChange={(value) => {
          const separator = value.indexOf("::");
          if (separator <= 0) {
            return;
          }

          const nextProvider = value.slice(0, separator);
          const nextModel = value.slice(separator + 2);
          const match = registry.providers.find((entry) => entry.id === nextProvider);
          if (!match || !nextModel) {
            return;
          }

          setProvider(match.id, nextModel);
        }}
        disabled={isSending}
      >
        <SelectTrigger className="chat-model-trigger">
          <span className="chat-model-selected">
            {selectedModel ? (
              <ProviderBadge logo={selectedProvider?.logo} name={providerName} />
            ) : null}
            <span>{modelLabel}</span>
          </span>
        </SelectTrigger>
        <SelectContent
          align="start"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className={cn("chat-model-content", motion.dropdown, menu.className)}
          data-origin={SELECT_ORIGIN}
          portalContainer={portalContainer}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            setQuery("");
            setThinkingOpen(null);
          }}
          onPointerDownOutside={() => setThinkingOpen(null)}
        >
          <div className="chat-model-search">
            <input
              autoFocus
              placeholder="Search models"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              className="chat-model-search-input"
            />
          </div>
          <div className="chat-model-list">
            {filteredProviders.length === 0 ? (
              <div className="chat-model-empty">No models found</div>
            ) : (
              filteredProviders.map((entry) => {
                const providerName = entry.name ?? entry.label;
                const hideLabel = filteredProviders.length === 1;

                return (
                  <Fragment key={entry.id}>
                    <SelectGroup className="chat-model-group">
                      {hideLabel ? null : (
                        <SelectLabel className="chat-model-label">
                          <ProviderBadge logo={entry.logo} name={providerName} />
                          <span>{providerName}</span>
                        </SelectLabel>
                      )}
                      {entry.models.map((item) => {
                        const key = `${entry.id}::${item.id}`;
                        const levels = item.thinkingLevels;
                        const defaultThinking =
                          levels && levels.length > 0
                            ? (levels.includes("medium") ? "medium" : levels[0])
                            : undefined;
                        const thinking = defaultThinking && levels ? { levels } : undefined;
                        const activeThinking = defaultThinking
                          ? (getThinkingLevel(entry.id, item.id) ?? defaultThinking)
                          : undefined;
                        const isOpen = thinkingOpen === key;

                        return (
                          <ModelRow
                            key={key}
                            itemKey={key}
                            item={item}
                            thinking={thinking}
                            activeThinking={activeThinking}
                            isOpen={isOpen}
                            onToggleThinking={() => setThinkingOpen(isOpen ? null : key)}
                            onPickThinking={(level) => {
                              setThinkingLevel(entry.id, item.id, level);
                              setThinkingOpen(null);
                            }}
                          />
                        );
                      })}
                    </SelectGroup>
                  </Fragment>
                );
              })
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
};

const ModelRow = ({
  itemKey,
  item,
  thinking,
  activeThinking,
  isOpen,
  onToggleThinking,
  onPickThinking,
}: {
  itemKey: string;
  item: { id: string; label: string; description?: string };
  thinking?: { levels: string[] };
  activeThinking?: string;
  isOpen: boolean;
  onToggleThinking: () => void;
  onPickThinking: (level: string) => void;
}) => {
  const menu = useDropdownPresence(isOpen);

  return (
    <div className="chat-model-row">
      <SelectItem value={itemKey} className="chat-model-item">
        <span className="chat-model-item-label">{item.label}</span>
        {item.description ? (
          <span className="chat-model-item-hint">{item.description}</span>
        ) : thinking && activeThinking ? (
          <span className="chat-model-item-hint">{activeThinking}</span>
        ) : null}
      </SelectItem>
      {thinking ? (
        <>
          <button
            type="button"
            aria-label="Thinking settings"
            className="chat-model-thinking-trigger"
            data-open={isOpen ? "true" : "false"}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
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
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              {thinking.levels.map((level) => {
                const isActive = level === activeThinking;
                return (
                  <button
                    key={level}
                    type="button"
                    className="chat-model-thinking-option"
                    data-active={isActive ? "true" : "false"}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onPickThinking(level);
                    }}
                  >
                    <span>{level}</span>
                    {isActive ? <Check className="chat-model-thinking-check" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
