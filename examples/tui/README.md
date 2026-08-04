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
- Thread sidebar (create / select / delete)
- Scrollable message viewport
- Model picker + Tab to cycle
- Paste into composer
- Help overlay (`?`)
- Protocol parts: text, reasoning, tools, sources
- Shared `ChatAdapter` (demo in-process, or `@sarchauhan/adapter/ai-sdk`)

## Shortcuts

| Key | Action |
| --- | --- |
| Enter | Send |
| Esc | Stop / close overlay |
| Ctrl+T / L / K / M | Focus threads / messages / composer / models |
| Ctrl+N / D | New / delete thread |
| Tab | Cycle model |
| ? | Help |
| ↑ / ↓ | Navigate / scroll |
| Ctrl+C | Quit |
