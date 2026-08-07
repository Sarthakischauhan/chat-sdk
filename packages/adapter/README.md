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

## How to use with an agent

Wrap your agent client in `defineAdapter`. The required method streams
assistant message snapshots; optional methods provide persistence:

```ts
import { defineAdapter, messagesFromEvents } from "@sarchauhan/adapter";

const adapter = defineAdapter({
  async *sendMessage({ threadId, messages, signal }) {
    const events = agent.run({ threadId, messages, signal });
    yield* messagesFromEvents(mapAgentEvents(events));
  },
  listThreads,
  createThread,
  loadMessages,
});
```

`mapAgentEvents` converts your agent's protocol into `AgentEvent` values from
`@sarchauhan/protocol`. Custom interactive behavior can be added in your
agent adapter and UI without changing the base contract.
