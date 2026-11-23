import type { Meta, StoryObj } from "@storybook/react";
import { WebSearchWidget, MessageContent } from "@sarchauhan/chat";

const results = [
  { url: "https://nodejs.org/en/blog/vulnerability", title: "Node.js security releases", snippet: "Review security advisories and supported release lines before upgrading." },
  { url: "https://nodejs.org/api/", title: "Node.js API documentation", snippet: "Reference documentation for the Node.js runtime and standard library." },
  { url: "https://github.com/nodejs/node/releases", title: "Node.js release notes", snippet: "Changes, fixes, and release assets from the upstream repository." },
];
const meta = {
  title: "Chat/Web search", component: WebSearchWidget,
  parameters: { hideComposer: true },
  args: { query: "Node.js security advisory", results, defaultOpen: true },
} satisfies Meta<typeof WebSearchWidget>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Sources: Story = {};
export const Collapsed: Story = { args: { defaultOpen: false } };
export const Running: Story = { args: { state: "running", results: [] } };
export const PartialResults: Story = { args: { state: "running", results: results.slice(0, 1) } };
export const Empty: Story = { args: { results: [] } };
export const Failed: Story = { args: { state: "error", error: "Search provider unavailable. Try again.", results: [] } };
export const MoreSources: Story = { args: { maxResults: 1 } };
export const LongContent: Story = { args: { query: "A long query that wraps on narrow screens without moving the status outside the tool row", results: [{ url: "https://example.com/" + "long-path/".repeat(20), title: "A long page title for checking source cards on small screens", snippet: "AnUnbrokenSnippet".repeat(20) }] } };
export const ProtocolTool: Story = {
  render: () => <MessageContent parts={[{ type: "tool", toolCallId: "web-1", toolName: "web_search", state: "output-available", input: { query: "Node.js security advisory" }, output: { results } }]} />,
};
