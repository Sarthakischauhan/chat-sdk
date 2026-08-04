# @sarchauhan/adapter

Unified chat adapter surface for `@sarchauhan/chat` (React) and `@sarchauhan/chat-tui` (Ink).

Implement once against this package — swap backends (AI SDK, Claude Agent SDK, Codex, custom HTTP) without changing the UI.

## API

```ts
import { defineAdapter, type ChatAdapter } from "@sarchauhan/adapter";

const adapter = defineAdapter({
  async *sendMessage({ message, messages, signal }) {
    // yield ChatMessage snapshots as the assistant streams
  },
  // optional: listThreads, createThread, deleteThread, loadMessages, editMessage
});
```

| Export | Role |
| --- | --- |
| `defineAdapter` | Type-safe adapter factory (requires `sendMessage`) |
| `ChatAdapter` | Backend contract both UIs consume |
| `messagesFromEvents` | `AgentEvent` stream → `ChatMessage` yields |
| `createUserMessage` / `upsertAssistantMessage` | Message helpers |

Drop-in AI SDK transport: `@sarchauhan/adapter/ai-sdk` (`packages/adapter/ai-sdk`).
