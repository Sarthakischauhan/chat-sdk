# @sarchauhan/chat-tui

Ink terminal UI for the shared `@sarchauhan/adapter` contract.

## Features

- Linear conversation viewport
- Slash commands (`/new`, `/model`, `/threads`, `/help`, `/delete`)
- Scrollable message history
- Streaming spinner + status bar
- Composer with paste support
- Help overlay (`?`)
- Protocol part rendering (text, reasoning, tools, sources, files, widgets)
- `renderChat({ alternateScreen: true })`

## Usage

```ts
import { renderChat } from "@sarchauhan/chat-tui";
import { createAiSdkAdapter } from "@sarchauhan/adapter/ai-sdk";

renderChat({
  adapter: createAiSdkAdapter(),
  models: [{ id: "llama3.2", label: "llama3.2", provider: "ollama" }],
  mode: "linear",
});
```

See `examples/tui` for a full showcase (`npm run tui`).

## Composition

`Chat` is a convenience shell. For a custom Ink application, compose the
provider and reusable panels directly:

```tsx
import {
  ChatComposer,
  ChatContextProvider,
  type ChatAdapter,
  Message,
  StatusBar,
  ThreadList,
} from "@sarchauhan/chat-tui";

function App({ adapter }: { adapter: ChatAdapter }) {
  return (
    <ChatContextProvider adapter={adapter}>
      <StatusBar />
      <ThreadList />
      <Message />
      <ChatComposer />
    </ChatContextProvider>
  );
}
```

Use `ChatLayout` (or `ChatShell`) when you want the standard full-screen
arrangement while still supplying your own provider and surrounding UI.
