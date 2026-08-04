import type { ChatMessage } from "./types";

export const createMessageId = (prefix = "msg") =>
  globalThis.crypto?.randomUUID?.() ??
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createUserMessage = (text: string): ChatMessage => ({
  id: createMessageId("msg"),
  role: "user",
  parts: [{ type: "text", text }],
});

export const createAssistantMessage = (
  parts: ChatMessage["parts"] = [],
  id = createMessageId("assistant"),
): ChatMessage => ({
  id,
  role: "assistant",
  parts,
});

export const upsertAssistantMessage = (
  current: ChatMessage[],
  nextMessage: ChatMessage,
): ChatMessage[] => {
  const existingIndex = current.findIndex((message) => message.id === nextMessage.id);

  if (existingIndex === -1) {
    return [...current, nextMessage];
  }

  return current.map((message, index) =>
    index === existingIndex ? nextMessage : message,
  );
};
