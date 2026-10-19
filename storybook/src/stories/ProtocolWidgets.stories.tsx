import type { Meta, StoryObj } from "@storybook/react";
import {
  ApprovalWidget,
  PatchWidget,
  ReadFileWidget,
  SearchWidget,
  SubagentWidget,
  TerminalWidget,
} from "@sarchauhan/chat";
import type { SubagentStep, TerminalChunk } from "@sarchauhan/chat";
import type { AgentSubagent } from "@sarchauhan/protocol";

const meta = { title: "Chat/Protocol widgets", parameters: { hideComposer: true } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const pytest: TerminalChunk[] = [
  { stream: "stdout", text: "........................                     [100%]\n24 passed in 3.41s\n" },
];
const failing: TerminalChunk[] = [
  { stream: "stdout", text: "> chat-sdk@0.1.0 test\n> node --test session\n" },
  { stream: "stderr", text: "not ok 3 - resumes from lastEventId\n  AssertionError: expected 'abc' got undefined\n" },
];
const diff = [
  "@@ -41,6 +41,7 @@ export function connect(id: string)",
  "   const es = new EventSource(url(id));",
  "-  const cursor = 0;",
  "+  const cursor = lastEventId(id);",
  "+  if (cursor) es.url += `?after=${cursor}`;",
  "   es.onmessage = (e) => apply(e);",
].join("\n");
const agent: AgentSubagent = { id: "child-1", title: "Audit reconnect tests", state: "running" };
const steps: SubagentStep[] = [
  { id: "s1", label: "Searched for", target: "reconnect in tests/", meta: "6 matches" },
  { id: "s2", label: "Read", target: "tests/test_session.py", durationMs: 40 },
  { id: "s3", label: "Running", target: "pytest -k reconnect", state: "running", startedAt: ago(4_000) },
];

export const TerminalRunning: Story = {
  render: () => <TerminalWidget command="npm run build" state="running" startedAt={ago(12_000)} chunks={[{ stream: "stdout", text: "vite v6 building for production...\n" }]} />,
};
export const TerminalPassed: Story = {
  render: () => <TerminalWidget command="uv run pytest coding_agent/tests/test_web.py -q" exitCode={0} durationMs={3_400} chunks={pytest} />,
};
export const TerminalFailedStderr: Story = {
  render: () => <TerminalWidget command="npm test -- session" state="error" exitCode={1} durationMs={1_400} chunks={failing} />,
};
export const TerminalTimeout: Story = {
  render: () => <TerminalWidget command="npm run e2e" state="error" error="Timed out" exitCode={null} durationMs={120_000} chunks={[{ stream: "stdout", text: "waiting for server...\n" }]} />,
};
export const TerminalLegacySession: Story = {
  render: () => <TerminalWidget command="ls src" output={"session.ts\nretry.ts\napi.ts\n"} />,
};
export const SummaryCounts: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 4 }}>
      <ReadFileWidget path="src/session.ts" content={"export {};"} summary={{ lines: 120 }} durationMs={12} />
      <SearchWidget query="lastEventId" results={[]} summary={{ matches: 2 }} />
      <PatchWidget path="src/session.ts" diff={diff} summary={{ added: 2, removed: 1 }} durationMs={30} />
    </div>
  ),
};
export const Approval: Story = {
  render: () => (
    <ApprovalWidget
      question="It already exists and will be overwritten."
      target="src/retry.ts"
      toolName="write_file"
      bytes={1204}
      choices={["Deny", "Always allow", "Allow once"]}
      defaultChoice="Allow once"
      onAnswer={async () => undefined}
    />
  ),
};
export const ApprovalWithoutMetadata: Story = {
  render: () => <ApprovalWidget question="Run `rm -rf dist`?" choices={["Deny", "Allow once"]} onAnswer={async () => undefined} />,
};
export const DelegatedSteps: Story = { render: () => <SubagentWidget subagent={agent} steps={steps} /> };
export const DelegatedStepsDone: Story = {
  render: () => (
    <SubagentWidget
      subagent={{ ...agent, state: "completed", summary: "3 reconnect tests pass." }}
      steps={[...steps.slice(0, 2), { id: "s3", label: "Ran", target: "pytest -k reconnect", durationMs: 4_200 }]}
    />
  ),
};
export const SpecSequence: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 2 }}>
      <ReadFileWidget path="src/session.ts" content={"export {};"} summary={{ lines: 120 }} />
      <SearchWidget query="lastEventId" results={[]} summary={{ matches: 2 }} />
      <PatchWidget path="src/session.ts" diff={diff} summary={{ added: 2, removed: 1 }} />
      <TerminalWidget command="uv run pytest coding_agent/tests/test_web.py -q" exitCode={0} durationMs={3_400} chunks={pytest} />
      <TerminalWidget command="npm run build" state="running" startedAt={ago(12_000)} />
      <TerminalWidget command="npm run lint" exitCode={0} durationMs={2_100} chunks={[]} />
      <TerminalWidget command="npm test -- session" state="error" exitCode={1} durationMs={1_400} chunks={failing} />
    </div>
  ),
};
