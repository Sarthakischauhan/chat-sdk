# @sarchauhan/ai-sdk

AI SDK-backed `ChatAdapter` for `@sarchauhan/chat` and `@sarchauhan/chat-tui`.

Built on `@sarchauhan/adapter` + Vercel AI SDK (`DefaultChatTransport` / `readUIMessageStream`).

## Usage

```ts
import { Chat } from "@sarchauhan/chat";
import { createAiSdkAdapter } from "@sarchauhan/ai-sdk";

<Chat adapter={createAiSdkAdapter()} />
```

`createDefaultFetchAdapter` is kept as an alias for drop-in compatibility with the previous example helper.
