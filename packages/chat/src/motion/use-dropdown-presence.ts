"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { motion, type DropdownPhase } from "./classes";
import { prefersReducedMotion, readDurationMs } from "./helpers";

const resolveRoot = (root?: Element | RefObject<Element | null> | null) =>
  root && "current" in root ? root.current : (root ?? null);

/**
 * Keep a dropdown mounted through the close tween and apply the
 * documented `.is-open` / `.is-closing` hooks (05-menu-dropdown).
 *
 * Mounts at rest (pre-scale, opacity 0), then adds `.is-open` on the
 * next frame so the open transition actually plays.
 */
export function useDropdownPresence(
  open: boolean,
  root?: Element | RefObject<Element | null> | null,
) {
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<DropdownPhase>(open ? "open" : "rest");
  const mountedRef = useRef(open);
  mountedRef.current = mounted;

  useEffect(() => {
    const node = resolveRoot(root);

    if (open) {
      setMounted(true);
      setPhase("rest");
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setPhase("open"));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    if (!mountedRef.current) {
      return;
    }

    setPhase("closing");
    const closeMs = prefersReducedMotion() ? 0 : readDurationMs("--dropdown-close-dur", 150, node);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setPhase("rest");
    }, closeMs);

    return () => window.clearTimeout(timer);
  }, [open, root]);

  const className =
    phase === "open" ? motion.isOpen : phase === "closing" ? motion.isClosing : undefined;

  return { mounted, phase, className } as const;
}
