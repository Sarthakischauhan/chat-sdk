# Chat SDK

A package-first TypeScript workspace for embeddable chat interfaces. React UI, terminal UI, backend adapters, and the event protocol are independently built packages. Next.js apps are examples, not the SDK runtime.

| Package | Path | Purpose |
| --- | --- | --- |
| `@sarchauhan/chat` | `packages/chat` | React chat, themes, prebuilt/computed tool widgets |
| `@sarchauhan/protocol` | `packages/protocol` | Stream events, normalized parts, reducers |
| `@sarchauhan/adapter` | `packages/adapter` | Backend-neutral adapter contract |
| `@sarchauhan/adapter-ai-sdk` | `packages/adapter/ai-sdk` | Optional AI SDK integration |
| `@sarchauhan/chat-tui` | `packages/chat-tui` | Terminal chat UI |

```bash
npm install
npm run build        # SDK packages only, no app or database required
npm run typecheck
npm test             # built-package regression tests
npm run storybook    # component gallery on port 6006
```

## Embed in a React app

```tsx
import { Chat } from "@sarchauhan/chat";
import type { ChatAdapter } from "@sarchauhan/adapter";
import "@sarchauhan/chat/styles.css";

const adapter: ChatAdapter = {
  async *sendMessage(input) {
    // Yield normalized assistant message snapshots from your backend.
    yield { id: "reply", role: "assistant", parts: [{ type: "text", text: "Hello" }] };
  },
};

<Chat adapter={adapter} defaultTheme="system" showModelSelector={false} />;
```

Prebuilt read-file, patch/diff, search, and question components are available at `@sarchauhan/chat/widgets` and from the root export. Known tool parts compute these views automatically; custom widget registries can override them. See [the chat package documentation](packages/chat/README.md) for payloads, interactive responses, and standalone usage.

## Example applications

Each example owns its app dependencies, configuration, and scripts. The apps consume SDK exports rather than TypeScript source aliases. Build the packages after SDK edits before running an example.

```bash
npm run dev                     # Symphony example
npm run dev:ai-sdk              # AI SDK example
npm run build:symphony-example  # SDK + Symphony app
npm run build:ai-sdk-example    # SDK + AI SDK app
npm run tui                     # terminal demo
```

Configure example-specific environment/database settings using [the Symphony guide](examples/next-symphony/README.md) or [the AI SDK guide](examples/next-ai-sdk/README.md).

The protocol supports text, reasoning, tool states, sources, files, data, and widgets. It mirrors AI SDK UI stream shapes while providing a transport-neutral render model and event reducers usable with any backend.
