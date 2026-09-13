"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";
import { cn } from "../lib/utils";
import { motion } from "./classes";
import { prefersReducedMotion, readDurationMs } from "./helpers";

type TextSwapProps = {
  text: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

/**
 * Status-line text that swaps in place (transitions.dev text-states-swap).
 * React keeps the outgoing string painted until the exit phase finishes.
 */
export function TextSwap({ text, className, ...props }: TextSwapProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shownRef = useRef(text);

  useEffect(() => {
    const el = ref.current;
    if (!el || shownRef.current === text) {
      return;
    }

    if (prefersReducedMotion()) {
      shownRef.current = text;
      el.textContent = text;
      return;
    }

    const dur = readDurationMs("--text-swap-dur", 200, el);
    el.classList.add(motion.isExit);

    const timer = window.setTimeout(() => {
      el.classList.remove(motion.isExit);
      el.classList.add(motion.isEnterStart);
      el.textContent = text;
      shownRef.current = text;
      void el.offsetHeight;
      el.classList.remove(motion.isEnterStart);
    }, dur);

    return () => window.clearTimeout(timer);
  }, [text]);

  return (
    <span ref={ref} className={cn(motion.textSwap, className)} {...props}>
      {shownRef.current}
    </span>
  );
}
