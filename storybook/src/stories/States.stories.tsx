import { LoadingState, MessageContent, ThinkingBlock } from "@sarchauhan/chat";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Messages/States",
  parameters: {
    hideComposer: true,
  },
} satisfies Meta;

export default meta;

export const Loading: StoryObj = {
  name: "Loading state",
  render: () => <LoadingState />,
};

export const Thinking: StoryObj = {
  name: "Thinking",
  render: () => (
    <ThinkingBlock isComplete={false}>
      <div className="md-thinking-body">
        The response trace remains available without taking focus away from the conversation.
      </div>
    </ThinkingBlock>
  ),
};

export const ThinkingComplete: StoryObj = {
  name: "Thinking complete",
  render: () => (
    <ThinkingBlock isComplete elapsedMs={4_000}>
      <div className="md-thinking-body">
        The response trace remains available without taking focus away from the conversation.
      </div>
    </ThinkingBlock>
  ),
};

export const ToolChips: StoryObj = {
  name: "Tool chips",
  render: () => (
    <MessageContent
      parts={[
        {
          type: "tool",
          toolName: "list_files",
          toolCallId: "storybook-tool-1",
          state: "output-available",
          title: "Read project files",
          input: { path: "packages/chat/src/components" },
          output: { files: ["message.tsx", "message.thinking.tsx"] },
        },
        {
          type: "tool",
          toolName: "web_search",
          toolCallId: "storybook-tool-2",
          state: "input-streaming",
          title: "Search references",
          input: { query: "modern conversational interface patterns" },
        },
      ]}
    />
  ),
};
