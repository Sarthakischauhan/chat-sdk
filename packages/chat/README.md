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
