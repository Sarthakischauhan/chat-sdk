# @sarchauhan/chat-tui

Ink terminal UI for the same `ChatAdapter` contract used by `@sarchauhan/chat`.

Message parts are normalized with `@sarchauhan/protocol` before render. Raw protocol event streams can be converted to adapter message snapshots via `messagesFromEvents`.

## Usage

```ts
import { renderChat } from "@sarchauhan/chat-tui";
import type { ChatAdapter } from "@sarchauhan/chat-tui";

const adapter: ChatAdapter = {
  async *sendMessage({ message }) {
    // yield ChatMessage snapshots as the assistant streams
  },
};

renderChat({ adapter });
```

### Components

| Export | Role |
| --- | --- |
| `Chat` | Root shell (messages + composer) |
| `ChatProvider` / `useChat` | Adapter-backed state |
| `MessageList` / `MessageItem` | Normalized part rendering |
| `ChatComposer` | Line input (Enter send, Esc stop) |
| `renderChat` | Mount with Ink `render` |
| `messagesFromEvents` | `AgentEvent` stream → `ChatMessage` yields |

Controls: Enter send · Esc stop · Ctrl+C quit
