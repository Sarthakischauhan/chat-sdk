import type { Meta, StoryObj } from "@storybook/react";
import { PatchWidget, ReadFileWidget, SearchWidget, SubagentWidget } from "@sarchauhan/chat";
import type { AgentSubagent } from "@sarchauhan/protocol";

const meta = { title: "Chat/Tool widget states", parameters: { hideComposer: true } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const content = Array.from({ length: 12 }, (_, i) => `export const step${i} = ${i};`).join("\n");
const diff = [
  "--- a/src/session.ts",
  "+++ b/src/session.ts",
  "@@ -41,6 +41,7 @@ export function connect(id: string)",
  "   const es = new EventSource(url(id));",
  "-  const cursor = 0;",
  "+  const cursor = lastEventId(id);",
  "+  if (cursor) es.url += `?after=${cursor}`;",
  "   es.onmessage = (e) => apply(e);",
].join("\n");
const results = [
  { path: "src/session.ts", line: 12, text: "const lastEventId = (id: string) => store.get(id);" },
  { path: "src/retry.ts", line: 4, text: "lastEventId(id)" },
];
const agent: AgentSubagent = {
  id: "run-1",
  title: "Audit reconnect tests",
  task: "Find tests covering stream reconnect and run them.",
  state: "running",
};

export const Read: Story = { render: () => <ReadFileWidget path="src/session.ts" content={content} /> };
export const ReadRunning: Story = { render: () => <ReadFileWidget path="src/session.ts" state="running" /> };
export const ReadFailed: Story = { render: () => <ReadFileWidget path="private.env" state="error" error="File could not be read." /> };
export const Search: Story = { render: () => <SearchWidget query="lastEventId" results={results} /> };
export const SearchRunning: Story = { render: () => <SearchWidget query="lastEventId" state="running" /> };
export const Patch: Story = { render: () => <PatchWidget path="src/session.ts" diff={diff} /> };
export const PatchRunning: Story = { render: () => <PatchWidget path="src/session.ts" diff={diff} state="running" /> };
export const PatchApproval: Story = { render: () => <PatchWidget path="src/retry.ts" diff={diff} state="approval" /> };
export const PatchDenied: Story = { render: () => <PatchWidget path="src/retry.ts" diff={diff} state="denied" /> };
export const PatchFailed: Story = { render: () => <PatchWidget path="src/retry.ts" state="error" error="Patch did not apply cleanly." /> };
export const Delegated: Story = { render: () => <SubagentWidget subagent={agent} /> };
export const DelegatedDone: Story = {
  render: () => <SubagentWidget subagent={{ ...agent, state: "completed", summary: "3 reconnect tests pass." }} />,
};
export const DelegatedFailed: Story = {
  render: () => <SubagentWidget subagent={{ ...agent, state: "failed", error: "pytest exited before collecting tests." }} />,
};
export const Sequence: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 4 }}>
      <ReadFileWidget path="src/session.ts" content={content} />
      <SearchWidget query="lastEventId" results={results} />
      <PatchWidget path="src/session.ts" diff={diff} />
      <PatchWidget path="src/retry.ts" diff={diff} state="approval" />
      <SubagentWidget subagent={agent} />
    </div>
  ),
};
