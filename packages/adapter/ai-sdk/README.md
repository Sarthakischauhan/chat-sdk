# @sarchauhan/adapter/ai-sdk

AI SDK transport for the shared adapter surface. Lives at `packages/adapter/ai-sdk`.

```ts
import { createAiSdkAdapter } from "@sarchauhan/adapter/ai-sdk";

<Chat adapter={createAiSdkAdapter()} />
```

## How to use with an agent

Use this adapter when your agent endpoint speaks the AI SDK UI message stream
protocol. Configure the chat and thread endpoints, then pass the adapter to
`@sarchauhan/chat-tui` or `@sarchauhan/chat`:

```ts
const adapter = createAiSdkAdapter({
  chatUrl: "http://localhost:3000/api/chat",
  threadsUrl: "http://localhost:3000/api/threads",
});
```

For a different agent protocol, implement `ChatAdapter` directly and map its
events with `messagesFromEvents`.

Built with `defineAdapter` from `@sarchauhan/adapter` + Vercel AI SDK (`DefaultChatTransport` / `readUIMessageStream`).

`createDefaultFetchAdapter` is kept as an alias for drop-in compatibility.

> Workspace package name: `@sarchauhan/adapter-ai-sdk` (npm). Prefer the subpath import `@sarchauhan/adapter/ai-sdk`.
