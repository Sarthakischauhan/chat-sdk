# @sarchauhan/chat-tui

Ink terminal UI for the shared `@sarchauhan/adapter` contract.

## Features

- Threads sidebar (list / create / delete / select)
- Model picker + Tab cycle
- Scrollable message viewport
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
});
```

See `examples/tui` for a full showcase (`npm run tui`).
