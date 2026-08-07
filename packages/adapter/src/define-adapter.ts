import type { ChatAdapter } from "./types";

/**
 * Define a chat adapter for `@sarchauhan/chat` / `@sarchauhan/chat-tui`.
 *
 * Use this for custom backends (Claude Agent SDK, Codex, your own API, etc.).
 * The returned object is the same shape both UIs already consume.
 */
export function defineAdapter<T extends ChatAdapter>(adapter: T): T {
  if (typeof adapter?.sendMessage !== "function") {
    throw new Error("@sarchauhan/adapter: defineAdapter requires sendMessage");
  }

  return adapter;
}
