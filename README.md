# Chat SDK

Chat SDK is a monorepo for building streaming chat UIs on top of the [Vercel AI SDK](https://ai-sdk.dev). It includes a React chat package, an agent event protocol package, and a Next.js example app.

## Packages

| Package | Path | Description |
| --- | --- | --- |
| `@sarchauhan/chat` | `packages/chat` | Chat UI (`Chat`, message list, composer, model select) |
| `@sarchauhan/protocol` | `packages/protocol` | Agent stream events + normalized parts for rendering |

## Are protocol events the same as the AI SDK?

Yes. `@sarchauhan/protocol` event types mirror the AI SDK **UI message stream** chunk types (`text-start`, `text-delta`, `reasoning-*`, `tool-input-*`, `tool-output-*`, `start-step`, `finish`, `data-*`, and so on).

What this package adds:

1. **Events** — typed stream chunks compatible with AI SDK UI streams
2. **Parts** — a stable render model (`text`, `reasoning`, `tool`, `step-start`, `source-*`, `file`, `data`)
3. **Helpers** — `normalizeAgentParts` (from AI SDK `UIMessage.parts`) and `reduceAgentEvents` (from raw stream events)

So if your backend returns `toUIMessageStreamResponse()` / `createAgentUIStreamResponse()`, the chat UI can already understand those parts. Use the protocol package when you want shared types or to reduce raw events yourself.

## Features

- Chat interface built with React
- OpenAI, Anthropic, Google, and Ollama model selection
- Streaming responses via the AI SDK UI message stream
- Agent event rendering: reasoning, tools, steps, sources, files, data parts, and widgets
- Example Next.js app under `examples/next`

## Getting Started

Install dependencies:

```bash
bun install
# or: npm install
```

Build packages:

```bash
bun run build:chat
# or: npm run build:chat
```

Create `examples/next/.env.local` and add the API keys you want to use:

```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
```

Start the development server:

```bash
bun run dev
# or: npm run dev
```

Open `http://localhost:3000` in your browser.

## End-user usage

### Drop-in chat UI

Wire any adapter that yields AI SDK `UIMessage`-shaped messages. The UI normalizes parts through the protocol and renders them.

```tsx
"use client";

import { Chat } from "@sarchauhan/chat";
import { createDefaultFetchAdapter } from "@/lib/adapters/fetch";

export default function Page() {
  return (
    <main>
      <Chat adapter={createDefaultFetchAdapter()} />
    </main>
  );
}
```

Your `/api/chat` route can keep using the AI SDK as usual:

```ts
import { convertToModelMessages, streamText, stepCountIs, tool } from "ai";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model,
    messages: await convertToModelMessages(messages),
    tools: {
      getCurrentTime: tool({
        description: "Get the current time",
        inputSchema: /* your schema */,
        execute: async () => ({ iso: new Date().toISOString() }),
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
```

Ask something like “what time is it?” and the assistant message will show tool call + result blocks, then the final text.

### Widgets (generative UI)

Widgets are not a separate event bus. They reuse AI SDK stream parts:

1. `data-widget` parts with `{ name, props, interactive? }`
2. Tool parts whose tool name is registered in the chat widget map
3. Other `data-*` parts whose name matches a registered widget

Register components on `Chat`:

```tsx
import { Chat, QuestionWidget, MapWidget } from "@sarchauhan/chat";

<Chat
  adapter={createDefaultFetchAdapter()}
  widgets={{
    question: QuestionWidget,
    map: MapWidget,
    // weather: WeatherWidget,
  }}
/>
```

Built-in `question` and `map` widgets are included by default.

Server-side, emit a widget with AI SDK data parts:

```ts
import { createWidgetData } from "@sarchauhan/protocol";

writer.write(
  createWidgetData(
    "question",
    {
      prompt: "Where should we meet?",
      options: ["Cafe", "Park", "Office"],
    },
    { interactive: true, id: "meet-1" },
  ),
);
```

Or return props from a tool named `question` / `map` — the UI maps those tool results to the same widgets. Interactive widgets call back into `sendMessage` with the user's choice.

### Use protocol helpers directly

Normalize AI SDK message parts for custom UI:

```ts
import { normalizeAgentParts } from "@sarchauhan/protocol";

// message.parts comes from AI SDK UIMessage
const parts = normalizeAgentParts(message.parts);

for (const part of parts) {
  switch (part.type) {
    case "text":
      renderText(part.text);
      break;
    case "reasoning":
      renderThinking(part.text, part.state);
      break;
    case "tool":
      renderTool(part.toolName, part.state, part.input, part.output);
      break;
    case "widget":
      renderWidget(part.name, part.props, part.interactive);
      break;
    case "step-start":
      renderStepDivider();
      break;
    // source-url | source-document | file | data | unknown
  }
}
```

Or reduce raw AI SDK stream events into one assistant message snapshot:

```ts
import {
  createAgentMessageState,
  applyAgentEvent,
  type AgentEvent,
} from "@sarchauhan/protocol";

let state = createAgentMessageState("msg_1");

for await (const event of readAgentEventStream()) {
  state = applyAgentEvent(state, event as AgentEvent);
  // state.message.parts is ready for rendering
}
```

## Tech Stack

- Next.js
- React
- TypeScript
- Vercel AI SDK
- Tailwind CSS
