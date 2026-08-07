# chat-tui example

Full-screen Ink showcase for `@sarchauhan/chat-tui` + `@sarchauhan/adapter`.

## Run

From the repo root (after `npm install`):

```bash
# Local demo adapter (no server)
npm run tui

# Against examples/next APIs
npm run dev          # terminal A
npm run tui:remote   # terminal B
```

Or from this folder:

```bash
npm start
npm run remote
```

## Features shown

- Alternate screen full-app layout
- Status bar (thread · model · streaming spinner)
- Linear conversation viewport
- Slash commands for conversations and models
- Inline thread and model selectors
- Paste into composer
- Help overlay (`?`)
- Protocol parts: text, reasoning, tools, sources
- Shared `ChatAdapter` (demo in-process, or `@sarchauhan/adapter/ai-sdk`)

## Commands

| Command | Action |
| --- | --- |
| `/new` or `/clear` | Start a new conversation |
| `/model` | Open the model selector |
| `/model <id>` | Select a model directly |
| `/threads` | Browse conversations |
| `/delete` | Delete the current conversation |
| `/stop` | Stop a response |
| `/help` | Show help |

## Shortcuts

| Key | Action |
| --- | --- |
| Enter | Send |
| Esc | Stop / close help |
| Ctrl+T / L / K / M | Open threads / scroll / composer / models |
| Ctrl+N / D | New / delete conversation |
| Tab | Cycle model |
| ↑ / ↓ | Navigate / scroll |
| Ctrl+C | Quit |
