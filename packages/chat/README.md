# @sarchauhan/chat

An embeddable React chat package with streaming messages, themes, tool views, and interactive widgets. Next.js is only used by the example apps. Bring any backend through `ChatAdapter`.

```tsx
import { Chat } from "@sarchauhan/chat";
import "@sarchauhan/chat/styles.css";

<Chat adapter={adapter} />;
```

## Prebuilt components

```tsx
import { ReadFileWidget, PatchWidget, SearchWidget, QuestionWidget } from "@sarchauhan/chat/widgets";

<div className="chat-root" data-theme="light">
  <ReadFileWidget path="src/config.ts" content="export const retries = 3;" startLine={12} />
  <PatchWidget path="src/config.ts" before="const retries = 1;\n" after="const retries = 3;\n" />
  <SearchWidget query="retries" results={[{ path: "src/config.ts", line: 12, text: "export const retries = 3;" }]} />
  <QuestionWidget
    prompt="How should messages load?"
    options={[{ label: "Stream", value: "stream", description: "Render responses as they arrive.", recommended: true }, "Wait for completion"]}
    allowCustom
    onSubmit={async ({ values, text }) => { await submitAnswer({ values, text }); }}
  />
</div>;
```

Import `styles.css` once. Standalone components inherit theme tokens from `.chat-root`. Read and patch views collapse when complete; running/error/approval views open automatically. Previews are bounded, with controls to show more. Diff colors indicate additions/deletions; everything else uses the existing neutral theme. Question supports radio/checkbox choices, descriptions, recommended choices, free text, explicit confirmation, disabled/submitted states, and retry after failed submission.

## Computed tool views

`Chat` includes `read-file`, `patch`, `search`, and `question` in its default widget registry. Backends can send them with `createWidgetData(name, props, { id, interactive })` from `@sarchauhan/protocol`.

Known tool parts are also mapped automatically:

| View | Tool names | Recognized payload |
| --- | --- | --- |
| Read file | `read`, `read_file`, `readFile`, `read-file` | Input `path`/`file`/`filename`/`file_path`; output string or `content`/`text`; optional `startLine`/`start_line`/`offset` |
| Patch | `patch`, `apply_patch`, `edit`, `edit_file` | Unified/apply-patch text in `diff`/`patch`, or `before`/`after`, `old_string`/`new_string`, `oldText`/`newText` |
| Search | `search`, `grep`, `file_search`, `web_search` | `query`/`pattern`/`search`; output array or `results`/`matches`; result path/file/url, optional line, text/snippet/content, title |
| Question | `question`, `ask_question` | Input `prompt`/`question`, `options`, optional `description`, `multiple`, `allowCustom` |

Unsupported payloads retain the generic tool view. Tool state/error are preserved, and completed question tools cannot be submitted again. A custom registry entry for the original tool name takes precedence; custom entries for canonical widget names override builtins too.

Question responses through `Chat` become user messages containing selected labels and custom text. For structured responses with widget IDs, use `WidgetProvider` and its `respondToWidget` callback with `MessageContent`/`WidgetRenderer`. Standalone `QuestionWidget` returns `{ values: string[], text?: string }` directly.

Public helpers: `computeToolWidget`, `computeToolState`, `computeDiff`, `computeTextDiff`, `normalizeSearchResults`, and `safeResultUrl`. Computed text diffs use one replacement hunk with three context lines; they preserve unchanged edges and final-newline markers. Supplied unified diffs retain their original hunks and file headers.

## Distribution

`npm run build` emits ESM, CommonJS, TypeScript declarations, source maps, and CSS assets. Both JS entry points preserve `"use client"` for React Server Component consumers. React/React DOM are peers; the package does not depend on Next.js or the AI SDK.

## Created files and images

Existing protocol `file` parts now render as artifact cards with image thumbnails, preview, open, and download actions. No changes to existing file event producers are needed.

Use `ArtifactWidget` for one file and `ArtifactsWidget` for a list. Text previews are escaped text; HTML and SVG are never embedded as active documents. Relative/signed download URLs remain owned by the backend. Raster images, HTTP(S), and blob URLs are supported; unsafe executable URLs are rejected. Browser cross-origin download behavior depends on the backend's Content-Disposition header.

For creation states and metadata, use the additive data envelope:

```ts
import { createArtifactData } from "@sarchauhan/protocol";
writer.write(createArtifactData({
  id: "report-1", filename: "report.md", mediaType: "text/markdown",
  status: "creating",
}));
// Later: same ID, complete snapshot replaces the card in place.
writer.write(createArtifactData({
  id: "report-1", filename: "report.md", mediaType: "text/markdown",
  status: "ready", url: "/files/report.md",
  content: "# Results\n\nThe adapter is ready.", sizeBytes: 1204,
}));
```

Tool outputs with an explicit `{ artifact }` or `{ artifacts: [...] }` envelope also compute these views for otherwise unrecognized tool names. Local filesystem paths are not assumed to be browser-downloadable URLs. The widget registry includes `artifact` and `artifacts`.

## Integrated subagents

A subagent appears as a compact activity card in the parent conversation. Its inspection view uses the same accessible dialog on every screen: a centered modal above 640px and a bottom sheet at or below 640px. It supports Escape/backdrop dismissal, focus containment/restoration, reduced motion, safe-area padding, a scrolling activity transcript, nested tool views, and created artifacts. Portal content inherits the host theme and custom chat tokens.

```ts
import { createSubagentData } from "@sarchauhan/protocol";
writer.write(createSubagentData({
  id: "session-1:research-1", parentId: "session-1:main",
  title: "Research agent", task: "Compare the storage options",
  state: "running", progress: 0.6,
  messages: [{
    id: "reply-1", role: "assistant",
    parts: [{ type: "text", text: "Checking the adapter contract." }],
  }],
}));
// Another full snapshot with the same ID updates the existing card/dialog.
```

`AgentSubagent` is independent of any harness. Map backend states into `queued`, `running`, `completed`, `failed`, or `cancelled`. IDs identify runs, not just agent names; namespace them across sessions/harnesses. `parentId` is optional correlation metadata. Progress is an optional fraction, not a fabricated estimate. Messages and artifacts are optional; include only the activity intended for users. System messages are excluded from the inspection transcript.

The event remains an existing `AgentDataEvent` (`data-subagent`); no new top-level event/part union or transport is introduced. Only `data-subagent` and `data-artifact` events with IDs replace previous snapshots within a message. Other data events retain append semantics. Each snapshot is complete: omitted fields are cleared rather than implicitly merged. Producers own event ordering and persistence; use one parent message per run or replace the prior parent message snapshot when continuing across turns. A harness that does not provide activity still produces a useful status/task card.

Use `SubagentWidget` directly for custom layouts, or let `Chat`/`MessageContent` render `data-subagent` through the builtin registry. Multiple run IDs render separate cards. Inspection nesting is bounded to three levels while keeping deeper status cards visible.
