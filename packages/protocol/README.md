# `@sarchauhan/protocol`

Agent stream protocol used by the chat SDK.

## Relationship to the AI SDK

Event names and payloads match the Vercel AI SDK **UI message stream** protocol
(`text-start` / `text-delta` / `tool-input-available` / `start-step` / …).

This package does not replace the AI SDK. It gives you:

- shared TypeScript types for those events
- normalized `AgentPart` values for UI rendering
- `normalizeAgentParts` for `UIMessage.parts`
- `reduceAgentEvents` / `applyAgentEvent` for raw event streams

## Install

In this monorepo the package is available as a workspace dependency:

```json
{
  "dependencies": {
    "@sarchauhan/protocol": "0.1.0"
  }
}
```

## Example

```ts
import {
  normalizeAgentParts,
  reduceAgentEvents,
} from "@sarchauhan/protocol";

// From an AI SDK UIMessage
const parts = normalizeAgentParts(message.parts);

// Or from a raw UI message stream
const state = reduceAgentEvents([
  { type: "start", messageId: "msg_1" },
  { type: "tool-input-start", toolCallId: "t1", toolName: "getCurrentTime" },
  {
    type: "tool-input-available",
    toolCallId: "t1",
    toolName: "getCurrentTime",
    input: { timezone: "UTC" },
  },
  {
    type: "tool-output-available",
    toolCallId: "t1",
    output: { iso: "2026-07-22T00:00:00.000Z" },
  },
  { type: "text-start", id: "txt_1" },
  { type: "text-delta", id: "txt_1", delta: "It is midnight UTC." },
  { type: "text-end", id: "txt_1" },
  { type: "finish", finishReason: "stop" },
]);

console.log(state.message.parts);
```
