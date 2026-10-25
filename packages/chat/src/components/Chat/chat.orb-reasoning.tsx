"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Activity state of the orb composer. `"thinking"` enables the live reasoning popover. */
export type ComposerOrbState = "idle" | "thinking";

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

type Phase = "closed" | "open" | "closing";

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
  reasoning,
  children,
}: {
  state: ComposerOrbState;
  reasoning: string;
  children: ReactNode;
}) {
  const active = state === "thinking" && reasoning.trim().length > 0;
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [held, setHeld] = useState(false);
  const [prevActive, setPrevActive] = useState(active);
  const [shown, setShown] = useState(active ? reasoning : "");
  const [phase, setPhase] = useState<Phase>("closed");
  const anchorRef = useRef<HTMLDivElement>(null);
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
  if (active && shown !== reasoning) {
    setShown(reasoning);
  }

  const engaged = (hovered || keyboardFocus) && !dismissed;
  const open = engaged && (active || held);
  if (open && phase !== "open") {
    setPhase("open");
  } else if (!open && phase === "open") {
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

  // Flip below the orb when there is no room above it.
  useLayoutEffect(() => {
    if (phase !== "open" || !anchorRef.current) {
      return;
    }
    const top = anchorRef.current.getBoundingClientRect().top;
    const height = popoverRef.current?.offsetHeight ?? 0;
    if (popoverRef.current) {
      popoverRef.current.dataset.side = top - height - 8 < 0 && height > 0 ? "bottom" : "top";
    }
  }, [phase]);

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

  return (
    <div
      ref={anchorRef}
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
      {phase === "closed" ? null : (
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
      )}
      {children}
    </div>
  );
}
