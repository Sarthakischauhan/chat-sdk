export type {
  ChatAdapter,
  ChatMessage,
  ChatRole,
  ChatStatus,
  ChatThread,
  EditMessageInput,
  SendMessageInput,
} from "@sarchauhan/adapter";

export type SendMessage = (
  message: { text: string },
  options?: { body?: { provider?: string; model?: string } },
) => Promise<void>;
