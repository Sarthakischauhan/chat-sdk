# Next.js Symphony example

This example is the Symphony-only integration. Symphony is the custom harness
and event-stream protocol used by the example; AI SDK providers are demonstrated
in `examples/next-ai-sdk`.

The chat route starts a run with `POST /runs`, reads the returned `events_url`,
and subscribes to that SSE endpoint. Symphony run creation and event streaming
are separate requests, so the chat adapter only receives the live event stream.

## Subagent events

The Symphony stream adapter groups child events by `payload.agent_id` whenever
`payload.parent_id` is present. It emits `data-widget` snapshots named
`subagent`, leaving the shared protocol and chat package unchanged.

- `agent_spawned` creates a live card with the child label, prompt, model, and ID.
- Child reasoning, tool calls, and text deltas update the card's activity timeline
  and live draft instead of appearing in the parent assistant response.
- `agent_completed` adds the final result and marks the card complete.
- `agent_failed` and child cancellation events show an error state.
- Nested children are shown as separate cards with their parent agent identified.
- The adapter replaces earlier snapshots for the same child ID, so one card is
  stored and rendered per child.

The ordinary `spawn_agent` tool block is suppressed because the subagent card
represents the same operation with its lifecycle and child activity attached.
