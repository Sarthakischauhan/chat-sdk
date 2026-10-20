import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { TerminalWidget } from "@sarchauhan/chat";
import type { TerminalChunk } from "@sarchauhan/chat";

const meta = { title: "Chat/Tool row layout", parameters: { hideComposer: true } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const status: TerminalChunk[] = [
  { stream: "stdout", text: " M packages/chat/src/widgets.css\n M packages/chat/src/widgets/tool-frame.tsx\n?? storybook/src/stories/ToolRowLayout.stories.tsx\n" },
];
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
/** Hosts often paint tool widgets as cards; header and body must share one inset. */
const card = { border: "1px solid var(--chat-border)", borderRadius: 4, background: "var(--chat-bg-elevated)" };

export const InCard: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={card}><TerminalWidget command="git status --short" exitCode={0} durationMs={200} chunks={status} /></div>
      <div style={card}><TerminalWidget command="npm run build" state="running" startedAt={ago(7_000)} chunks={[{ stream: "stdout", text: "building…\n" }]} /></div>
    </div>
  ),
};
export const RunningVsFinished: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 4 }}>
      <TerminalWidget command="npm run build" state="running" startedAt={ago(7_000)} chunks={[{ stream: "stdout", text: "building…\n" }]} />
      <TerminalWidget command="git status --short" exitCode={0} durationMs={200} chunks={status} />
      <TerminalWidget command="npm test" state="error" exitCode={1} durationMs={1_400} chunks={[{ stream: "stderr", text: "not ok 1\n" }]} />
    </div>
  ),
};
/** Starts running, finishes after 1.5s and closes itself unless toggled. */
function LiveRow() {
  const [done, setDone] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDone(true), 1500); return () => clearTimeout(t); }, []);
  return done
    ? <TerminalWidget command="npm run lint" exitCode={0} durationMs={1_500} chunks={[{ stream: "stdout", text: "clean\n" }]} />
    : <TerminalWidget command="npm run lint" state="running" startedAt={ago(0)} chunks={[]} />;
}
export const AutoClose: Story = { render: () => <LiveRow /> };
