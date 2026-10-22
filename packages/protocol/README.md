# `@sarchauhan/protocol`

Agent stream protocol used by the chat SDK.

## Relationship to the AI SDK

Event names and payloads match the Vercel AI SDK **UI message stream** protocol
(`text-start` / `text-delta` / `tool-input-available` / `start-step` / …).

This package does not replace the AI SDK. It gives you:

- shared TypeScript types for those events
- normalized `AgentPart` values for UI rendering (including `widget`)
- `normalizeAgentParts` for `UIMessage.parts`
- `reduceAgentEvents` / `applyAgentEvent` for raw event streams
- `createWidgetData` helpers for generative UI widgets over `data-widget`

## Install

In this monorepo the package is available as a workspace dependency:

```json
{
  "dependencies": {
    "@sarchauhan/protocol": "0.0.1"
  }
}
```

## How to use with an agent

Have your agent emit `AgentEvent` values, then reduce them into a message for
your UI or adapter:

```ts
import { reduceAgentEvents } from "@sarchauhan/protocol";

const state = reduceAgentEvents(agentEvents);
render(state.message);
```

Map custom agent events to the standard event types (`text-delta`,
`tool-input-available`, `tool-output-available`, and so on). Use `data-*`
events for agent-specific payloads such as plans, diffs, or terminal output.

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

## Widgets

Widgets are AI SDK `data-widget` payloads normalized to `AgentWidgetPart`:

```ts
import { createWidgetData, normalizeAgentParts } from "@sarchauhan/protocol";

const event = createWidgetData(
  "map",
  { lat: 37.77, lng: -122.42, label: "San Francisco" },
  { id: "sf" },
);

const [part] = normalizeAgentParts([
  { type: event.type, id: event.id, data: event.data },
]);
// part.type === "widget"
```

## Symphony artifacts

Types for the session artifacts of Symphony's stdio protocol 4 (the
`artifacts` capability). The fields are the wire's snake_case names.

- `ArtifactKind`: `"html" | "csv" | "json" | "image"` (`ARTIFACT_KINDS`,
  `isArtifactKind`)
- `ArtifactManifest`: `id`, `kind`, `title`, `created_at`, `updated_at`,
  `version`, `tool_call_id`, `source`, `entry`, `mime`, `sha256`, `size`
- `ArtifactEvent`: the `artifact_created` and `artifact_updated` events; the
  payload is the manifest plus `path`, the entry's absolute path on the host
- `ArtifactsListRequest` / `ArtifactsListReply` (`artifacts_list` →
  `artifacts`) and `ArtifactsGetRequest` / `ArtifactGetReply`
  (`artifacts_get` → `artifact` with `path` and `files`)
- `parseArtifactManifest(value)`: a typed manifest, or `null`

```ts
import { parseArtifactManifest } from "@sarchauhan/protocol";

if (frame.event === "artifact_created") {
  const artifact = parseArtifactManifest(frame.payload);
  if (artifact) show(artifact.title, artifact.kind);
}
```
