# @sarchauhan/adapter/ai-sdk

AI SDK transport for the shared adapter surface. Lives at `packages/adapter/ai-sdk`.

```ts
import { createAiSdkAdapter } from "@sarchauhan/adapter/ai-sdk";

<Chat adapter={createAiSdkAdapter()} />
```

Built with `defineAdapter` from `@sarchauhan/adapter` + Vercel AI SDK (`DefaultChatTransport` / `readUIMessageStream`).

`createDefaultFetchAdapter` is kept as an alias for drop-in compatibility.

> Workspace package name: `@sarchauhan/adapter-ai-sdk` (npm). Prefer the subpath import `@sarchauhan/adapter/ai-sdk`.
