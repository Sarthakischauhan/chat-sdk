import { useEffect, useState } from "react";
import { LoadingState, MessageContent, ThinkingBlock } from "@sarchauhan/chat";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Messages/Motion",
  parameters: {
    hideComposer: false,
  },
} satisfies Meta;

export default meta;

const ReplayButton = ({ onClick, children }: { onClick: () => void; children: string }) => (
  <button type="button" className="chat-text-button" onClick={onClick} style={{ marginTop: 12 }}>
    {children}
  </button>
);

export const ThinkingSwap: StoryObj = {
  name: "Thinking text swap",
  parameters: { hideComposer: true },
  render: function ThinkingSwapStory() {
    const [key, setKey] = useState(0);
    const [complete, setComplete] = useState(false);

    useEffect(() => {
      setComplete(false);
      const timer = window.setTimeout(() => setComplete(true), 1400);
      return () => window.clearTimeout(timer);
    }, [key]);

    return (
      <div>
        <ThinkingBlock key={key} isComplete={complete} elapsedMs={complete ? 1_400 : undefined}>
          <div className="md-thinking-body">
            The status line swaps in place when thinking finishes — old text exits up, the
            elapsed label enters from below.
          </div>
        </ThinkingBlock>
        <ReplayButton onClick={() => setKey((value) => value + 1)}>Replay swap</ReplayButton>
      </div>
    );
  },
};

export const ToolDoneMorph: StoryObj = {
  name: "Tool spinner → check",
  parameters: { hideComposer: true },
  render: function ToolDoneMorphStory() {
    const [key, setKey] = useState(0);
    const [done, setDone] = useState(false);

    useEffect(() => {
      setDone(false);
      const timer = window.setTimeout(() => setDone(true), 1200);
      return () => window.clearTimeout(timer);
    }, [key]);

    return (
      <div>
        <MessageContent
          key={key}
          parts={[
            {
              type: "tool",
              toolName: "web_search",
              toolCallId: `motion-tool-${key}`,
              state: done ? "output-available" : "input-streaming",
              title: "Search references",
              input: { query: "transitions.dev icon swap" },
              output: done ? { hits: 3 } : undefined,
            },
          ]}
        />
        <ReplayButton onClick={() => setKey((value) => value + 1)}>Replay morph</ReplayButton>
      </div>
    );
  },
};

export const ToolErrorShake: StoryObj = {
  name: "Tool error shake",
  parameters: { hideComposer: true },
  render: function ToolErrorShakeStory() {
    const [key, setKey] = useState(0);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
      setFailed(false);
      const timer = window.setTimeout(() => setFailed(true), 900);
      return () => window.clearTimeout(timer);
    }, [key]);

    return (
      <div>
        <MessageContent
          key={key}
          parts={[
            {
              type: "tool",
              toolName: "read_file",
              toolCallId: `motion-error-${key}`,
              state: failed ? "output-error" : "input-available",
              title: "Read config",
              input: { path: "packages/chat/src/motion/tokens.css" },
              errorText: failed ? "File is not readable in this session." : undefined,
            },
          ]}
        />
        <ReplayButton onClick={() => setKey((value) => value + 1)}>Replay shake</ReplayButton>
      </div>
    );
  },
};

export const LoadingLabelSwap: StoryObj = {
  name: "Loading label swap",
  parameters: { hideComposer: true },
  render: function LoadingLabelSwapStory() {
    const labels = ["Churning", "Thinking", "Working"] as const;
    const [index, setIndex] = useState(0);

    useEffect(() => {
      const timer = window.setInterval(() => {
        setIndex((value) => (value + 1) % labels.length);
      }, 1600);
      return () => window.clearInterval(timer);
    }, [labels.length]);

    return <LoadingState compact label={labels[index]} />;
  },
};

export const ModelSelectDropdown: StoryObj = {
  name: "Model select dropdown",
  render: () => (
    <p className="chat-empty-copy" style={{ margin: 0 }}>
      Open the model select in the composer to see the transitions.dev dropdown grow from the
      trigger. Press Enter on an empty composer to shake the invalid affordance.
    </p>
  ),
};
