"use client";
import { useCallback, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

export type StickToBottomOptions = {
  /** Distance from the bottom, in px, that still counts as "at the bottom". Default 48. */
  threshold?: number;
  /**
   * Re-stick and jump to the bottom whenever this value changes, even if the user had
   * scrolled up. Pass the thread/session id; to also cover the initial history load,
   * fold in whether content exists, e.g. `${threadId}:${messages.length > 0}`.
   */
  resetKey?: string | number | null;
};
export type StickToBottom = {
  /** True while the user is within `threshold` of the bottom. */
  isAtBottom: () => boolean;
  /** Jump to the bottom and re-stick (e.g. after the user sends a message). */
  scrollToBottom: () => void;
};

/**
 * Keep a scroll container pinned to the bottom while its content grows, but only
 * while the user is near the bottom. Once they scroll up, the view stays put.
 */
export function useStickToBottom<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { threshold = 48, resetKey }: StickToBottomOptions = {},
): StickToBottom {
  const stuck = useRef(true);

  const scrollToBottom = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    stuck.current = true;
    element.scrollTop = element.scrollHeight;
  }, [ref]);

  // A new thread/session (or the first history load) always starts at the latest message.
  useLayoutEffect(() => {
    scrollToBottom();
  }, [resetKey, scrollToBottom]);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const distance = () => element.scrollHeight - element.scrollTop - element.clientHeight;
    const onScroll = () => {
      stuck.current = distance() <= threshold;
    };
    const follow = () => {
      if (stuck.current) element.scrollTop = element.scrollHeight;
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(follow);
    observer?.observe(element);
    const watched = new Set<Element>();
    const watchChildren = () => {
      for (const child of Array.from(element.children)) {
        if (!watched.has(child)) {
          watched.add(child);
          observer?.observe(child);
        }
      }
      follow();
    };
    const mutations = typeof MutationObserver === "undefined" ? undefined : new MutationObserver(watchChildren);
    mutations?.observe(element, { childList: true, subtree: true, characterData: true });
    watchChildren();
    return () => {
      element.removeEventListener("scroll", onScroll);
      observer?.disconnect();
      mutations?.disconnect();
    };
  }, [ref, threshold]);

  return { isAtBottom: useCallback(() => stuck.current, []), scrollToBottom };
}
