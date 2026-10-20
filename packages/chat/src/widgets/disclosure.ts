"use client";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent, RefObject } from "react";

/**
 * Auto-open/close for a <details> row: open while `active`, close when it settles,
 * unless the user toggled it (then their choice wins). A text selection dragged
 * across the summary does not toggle the row.
 */
export function useAutoDisclosure(
  ref: RefObject<HTMLDetailsElement | null>,
  active: boolean,
  initialOpen: boolean = active,
) {
  const userTouched = useRef(false);
  // Uncontrolled after mount: React never rewrites `open`, so the user's state survives re-renders.
  const [defaultOpen] = useState(initialOpen);
  // The open state we expect. A toggle event that matches it is ours (mount or auto open/close), not the user's.
  const expected = useRef(initialOpen);
  const previous = useRef(active);

  useEffect(() => {
    const element = ref.current;
    if (!element || previous.current === active) return;
    previous.current = active;
    if (userTouched.current) return;
    expected.current = active;
    element.open = active;
  }, [active, ref]);

  const onToggle = () => {
    const element = ref.current;
    if (!element || element.open === expected.current) return;
    expected.current = element.open;
    userTouched.current = true;
  };

  const onSummaryClick = (event: MouseEvent<HTMLElement>) => {
    const selection = typeof window === "undefined" ? null : window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().length > 0) {
      event.preventDefault();
    }
  };

  return { defaultOpen, onToggle, onSummaryClick };
}
