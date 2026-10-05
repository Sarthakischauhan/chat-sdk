import type { ChatMessage } from "../../../types";
import type { ComposerFile } from "./types";

export const normalizeReferenceText = (text: string) =>
  text.replace(/\s+/g, " ").trim().slice(0, 4000);

export const createMessageId = (prefix: string) =>
  globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createUserMessage = (text: string, files: ComposerFile[] = []): ChatMessage => ({
  id: createMessageId("msg"),
  role: "user",
  parts: [
    ...files.map((file) => ({
      type: "file" as const,
      mediaType: file.mediaType,
      url: file.url,
      filename: file.filename,
    })),
    ...(text ? [{ type: "text" as const, text }] : []),
  ],
});

export const updateMessageText = (message: ChatMessage, text: string): ChatMessage => ({
  ...message,
  parts: [{ type: "text", text }],
});

export const upsertAssistantMessage = (current: ChatMessage[], nextMessage: ChatMessage) => {
  const existingIndex = current.findIndex((message) => message.id === nextMessage.id);

  if (existingIndex === -1) {
    return [...current, nextMessage];
  }

  return current.map((message, index) => (index === existingIndex ? nextMessage : message));
};
