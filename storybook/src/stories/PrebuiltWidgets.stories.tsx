import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  ReadFileWidget,
  PatchWidget,
  SearchWidget,
  QuestionWidget,
  MessageContent,
  WidgetProvider,
} from "@sarchauhan/chat";
import type { QuestionAnswer } from "@sarchauhan/chat";
const meta = {
  title: "Chat/Prebuilt widgets",
  parameters: { hideComposer: true },
  args: { path: "src/config.ts" },
  component: ReadFileWidget,
} satisfies Meta<typeof ReadFileWidget>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ReadFile: Story = {
  args: {
    path: "src/chat/adapter.ts",
    content:
      "export async function* sendMessage(input) {\n  const response = await fetch('/api/chat', input);\n  yield* readStream(response.body);\n}",
    startLine: 24,
  },
};
export const Patch: Story = {
  render: () => (
    <PatchWidget
      path="src/chat/adapter.ts"
      before={"const timeout = 5000;\nconst retries = 1;\n"}
      after={"const timeout = 10000;\nconst retries = 3;\n"}
    />
  ),
};
export const Search: Story = {
  render: () => (
    <SearchWidget
      query="sendMessage"
      results={[
        {
          path: "src/chat/adapter.ts",
          line: 24,
          text: "export async function* sendMessage(input) {",
        },
        {
          path: "src/chat/provider.tsx",
          line: 68,
          text: "await adapter.sendMessage({ threadId, message });",
        },
      ]}
    />
  ),
};
function InteractiveQuestion({ failOnce = false }: { failOnce?: boolean }) {
  const [answer, setAnswer] = useState<QuestionAnswer>();
  const [failed, setFailed] = useState(false);
  return (
    <>
      <QuestionWidget
        prompt="How should we load the conversation?"
        description="Choose a strategy before I update the adapter."
        options={[
          {
            label: "Stream messages",
            value: "stream",
            description: "Show each response as it arrives.",
            recommended: true,
          },
          {
            label: "Load complete responses",
            value: "batch",
            description: "Wait for the full response before rendering.",
          },
        ]}
        allowCustom
        onSubmit={async (value) => {
          if (failOnce && !failed) {
            setFailed(true);
            throw new Error("Connection lost. Please retry.");
          }
          setAnswer(value);
        }}
      />
      {answer ? (
        <output aria-label="Submitted answer">{JSON.stringify(answer)}</output>
      ) : null}
    </>
  );
}
export const Question: Story = { render: () => <InteractiveQuestion /> };
export const QuestionRetry: Story = {
  render: () => <InteractiveQuestion failOnce />,
};
export const MultipleChoice: Story = {
  render: () => (
    <QuestionWidget
      prompt="Which checks should run?"
      multiple
      options={["Typecheck", "Unit tests", "Browser tests"]}
      onSubmit={async () => undefined}
    />
  ),
};
export const ComputedTools: Story = {
  render: () => (
    <WidgetProvider respondToWidget={async () => undefined}>
      <MessageContent
        parts={[
          {
            type: "tool",
            toolName: "read_file",
            toolCallId: "read-1",
            state: "output-available",
            input: { path: "src/config.ts" },
            output: { content: "export const retries = 3;" },
          },
          {
            type: "tool",
            toolName: "grep",
            toolCallId: "search-1",
            state: "output-available",
            input: { pattern: "retries" },
            output: {
              matches: [
                {
                  file: "src/config.ts",
                  line: 1,
                  text: "export const retries = 3;",
                },
              ],
            },
          },
        ]}
      />
    </WidgetProvider>
  ),
};
export const FailedRead: Story = {
  args: {
    path: "private.env",
    state: "error",
    error: "File could not be read.",
  },
};
export const Reading: Story = {
  args: { path: "src/config.ts", state: "running" },
};
export const LongFile: Story = {
  args: {
    path: "src/generated.ts",
    content: Array.from(
      { length: 120 },
      (_, i) => `export const value${i} = ${i};`,
    ).join("\n"),
  },
};
