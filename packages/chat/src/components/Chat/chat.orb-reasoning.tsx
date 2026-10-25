"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Activity state of the orb composer. `"thinking"` enables the live reasoning popover. */
export type ComposerOrbState = "idle" | "thinking";

/** One streamed piece of reasoning. `id` must be stable per chunk (e.g. a token or delta id). */
export type ReasoningChunk = {
  id: string;
  text: string;
};

/** Ordered reasoning stream: append chunks as they arrive; `state` carries the status. */
export type ComposerReasoning = readonly ReasoningChunk[];

/** Concatenate a reasoning stream into display text. */
export const reasoningText = (chunks: ComposerReasoning) => chunks.map((chunk) => chunk.text).join("");

/** Timing contract for the orb reasoning popover, in milliseconds. */
export const orbReasoningTiming = {
  /** Hover intent before opening. */
  openDelay: 120,
  /** Grace period after the pointer leaves the orb or popover. */
  closeDelay: 200,
  /** Last frame kept on screen after thinking ends. */
  hold: 400,
  /** Exit tween (reduced motion: `exitReduced`). */
  exit: 120,
  exitReduced: 80,
} as const;

type Phase = "closed" | "entering" | "open" | "closing";

const GAP = 8;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isFocusVisible = (node: Element) => {
  try {
    return node.matches(":focus-visible");
  } catch {
    return false;
  }
};

/** Text announced to screen readers: everything up to the last finished sentence. */
export const announceableReasoning = (text: string, done: boolean) => {
  if (done) {
    return text.trim();
  }
  const match = /^[\s\S]*[.!?…](?=\s|$)/.exec(text);
  return match ? match[0].trim() : "";
};

/**
 * Wraps the orb composer and renders the live reasoning popover above it while
 * `state === "thinking"` and the orb is hovered or keyboard-focused.
 */
export function OrbReasoning({
  state,
  reasoning: chunks,
  children,
}: {
  state: ComposerOrbState;
  reasoning: ComposerReasoning;
  children: ReactNode;
}) {
  const text = reasoningText(chunks);
  const active = state === "thinking" && text.trim().length > 0;
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [held, setHeld] = useState(false);
  const [prevActive, setPrevActive] = useState(active);
  const [shown, setShown] = useState(active ? text : "");
  const [phase, setPhase] = useState<Phase>("closed");
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [host, setHost] = useState<Element | null>(null);
  const setAnchor = useCallback((node: HTMLDivElement | null) => {
    anchorRef.current = node;
    setHost(node ? (node.closest(".chat-root") ?? node.ownerDocument.body) : null);
  }, []);
  const popoverRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  // Focus that follows a pointer press is not keyboard focus (`:focus-visible` heuristic).
  const pointerFocus = useRef(false);

  // Derived during render: keep the last frame when thinking ends.
  if (active !== prevActive) {
    setPrevActive(active);
    setHeld(!active);
  }
  if (active && shown !== text) {
    setShown(text);
  }

  const engaged = (hovered || keyboardFocus) && !dismissed;
  const open = engaged && (active || held);
  if (open && (phase === "closed" || phase === "closing")) {
    setPhase("entering");
  } else if (!open && (phase === "open" || phase === "entering")) {
    setPhase("closing");
  }

  // Hold the last frame for `hold` ms, then let it fade.
  useEffect(() => {
    if (!held) {
      return;
    }
    const timer = window.setTimeout(() => setHeld(false), orbReasoningTiming.hold);
    return () => window.clearTimeout(timer);
  }, [held]);

  useEffect(() => {
    if (phase !== "closing") {
      return;
    }
    const ms = reducedMotion() ? orbReasoningTiming.exitReduced : orbReasoningTiming.exit;
    const timer = window.setTimeout(() => setPhase("closed"), ms);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  // Newest tokens stay in view.
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [shown, phase]);

  // The popover is portalled to the chat root (out of the composer's stacking
  // context, so backdrop-filter samples the content behind it) and positioned
  // fixed against the orb. It flips below when there is no room above.
  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const node = popoverRef.current;
    if (!anchor || !node) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const below = rect.top - node.offsetHeight - GAP < 0 && node.offsetHeight > 0;
    node.dataset.side = below ? "bottom" : "top";
    node.style.left = `${rect.left + rect.width / 2}px`;
    node.style.top = below ? `${rect.bottom + GAP}px` : "";
    node.style.bottom = below ? "" : `${window.innerHeight - rect.top + GAP}px`;
  }, []);

  useLayoutEffect(() => {
    if (phase === "closed") {
      return;
    }
    place();
    if (phase !== "entering") {
      return;
    }
    // Flush the resting style so the enter transition plays, then open.
    void popoverRef.current?.offsetHeight;
    const timer = window.setTimeout(() => setPhase((current) => (current === "entering" ? "open" : current)), 0);
    return () => window.clearTimeout(timer);
  }, [phase, place]);

  useEffect(() => {
    if (phase === "closed") {
      return;
    }
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [phase, place]);

  const scheduleHover = useCallback((next: boolean) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(
      () => {
        setHovered(next);
        if (next) {
          setDismissed(false);
        }
      },
      next ? orbReasoningTiming.openDelay : orbReasoningTiming.closeDelay,
    );
  }, []);

  const lastBreak = shown.lastIndexOf("\n");
  const older = lastBreak >= 0 ? shown.slice(0, lastBreak + 1) : "";
  const newest = lastBreak >= 0 ? shown.slice(lastBreak + 1) : shown;
  const announcement = announceableReasoning(shown, !active);

  const popover = (
    <div
      ref={popoverRef}
      className="chat-orb-reasoning"
      data-state={phase}
      data-held={held ? "true" : "false"}
    >
      <div ref={scrollRef} className="chat-orb-reasoning-text" aria-hidden="true">
        {older ? <span className="chat-orb-reasoning-older">{older}</span> : null}
        <span className="chat-orb-reasoning-newest">{newest}</span>
        {active ? <span className="chat-orb-reasoning-caret" /> : null}
      </div>
      <div role="status" aria-live="polite" className="chat-orb-reasoning-sr">
        {announcement}
      </div>
    </div>
  );

  return (
    <div
      ref={setAnchor}
      className="chat-orb-anchor"
      data-orb-state={state}
      onPointerEnter={() => scheduleHover(true)}
      onPointerLeave={() => scheduleHover(false)}
      onPointerDown={() => {
        pointerFocus.current = true;
      }}
      onFocus={(event) => {
        const fromPointer = pointerFocus.current;
        pointerFocus.current = false;
        if (!fromPointer || isFocusVisible(event.target)) {
          setKeyboardFocus(true);
          setDismissed(false);
        }
      }}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) {
          return;
        }
        setKeyboardFocus(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setDismissed(true);
        }
      }}
    >
      {phase === "closed" || !host ? null : createPortal(popover, host)}
      {children}
    </div>
  );
}
