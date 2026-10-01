import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ArtifactWidget, ArtifactsWidget, SubagentWidget, MessageContent } from "@sarchauhan/chat";
import type { AgentArtifact, AgentSubagent } from "@sarchauhan/protocol";
const image: AgentArtifact = { id: "image-1", filename: "concept.png", mediaType: "image/png", url: "https://placehold.co/1200x800/png", sizeBytes: 248320 };
const report: AgentArtifact = { id: "report-1", filename: "research.md", mediaType: "text/markdown", url: "/research.md", content: "# Research findings\n\nThe adapter supports incremental updates.", sizeBytes: 1204 };
const agent: AgentSubagent = {
  id: "run-1", title: "Research agent", task: "Compare storage options for conversation history",
  state: "running", progress: .6, summary: "Reviewed two approaches. Checking the streaming contract.",
  messages: [
    { id: "task", role: "user", parts: [{ type: "text", text: "Compare the storage options and prepare a recommendation." }] },
    { id: "a1", role: "assistant", parts: [
      { type: "text", text: "I found two useful approaches. I'll inspect their update behavior." },
      { type: "tool", toolName: "read_file", toolCallId: "read", state: "output-available", input: { path: "src/adapter.ts" }, output: { content: "export async function* sendMessage(input) {\n  yield* readStream(input);\n}" } },
    ] },
  ], artifacts: [report],
};
const meta = { title: "Chat/Artifacts and agents", parameters: { hideComposer: true } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const File: Story = { render: () => <ArtifactWidget artifact={report} /> };
export const Image: Story = { render: () => <ArtifactWidget artifact={image} /> };
export const CreatedFiles: Story = { render: () => <ArtifactsWidget artifacts={[image, report]} /> };
export const Creating: Story = { render: () => <ArtifactWidget artifact={{ ...report, status: "creating", url: undefined }} /> };
export const FailedArtifact: Story = { render: () => <ArtifactWidget artifact={{ ...report, status: "error", error: "The file could not be saved." }} /> };
export const Subagent: Story = { render: () => <SubagentWidget subagent={agent} /> };
export const FailedAgent: Story = { render: () => <SubagentWidget subagent={{ ...agent, state: "failed", error: "The research service timed out." }} /> };
export const ParallelAgents: Story = { render: () => <>{[agent, { ...agent, id: "run-2", title: "Implementation agent", task: "Update the conversation adapter", state: "queued" as const, progress: undefined, messages: [], artifacts: [] }].map((value) => <SubagentWidget key={value.id} subagent={value} />)}</> };
function LiveActivity() {
  const [snapshot, setSnapshot] = useState(agent);
  return <><button type="button" onClick={() => setSnapshot((current) => ({ ...current, state: "completed", progress: 1, summary: "Recommended an append-only message log." }))}>Complete agent</button><SubagentWidget subagent={snapshot} /></>;
}
export const LiveUpdates: Story = { render: () => <LiveActivity /> };
export const IntegratedMessage: Story = { render: () => <MessageContent parts={[
  { type: "text", text: "I delegated the comparison and created a report." },
  { type: "data-subagent", id: agent.id, data: agent },
  { type: "file", filename: report.filename, mediaType: report.mediaType, url: report.url },
]} /> };
