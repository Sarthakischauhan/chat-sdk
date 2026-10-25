import { ChatComposer, ChatContextProvider, useTheme, type ComposerOrbState, type ReasoningChunk } from "@sarchauhan/chat";
import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { noRegistryUrl } from "../mocks/adapter";

type OrbStoryArgs = {
  /** Fill the surface with dense text to check legibility over busy content. */
  busy: boolean;
  /** Milliseconds between streamed reasoning tokens. */
  tokenInterval: number;
};

const meta: Meta<OrbStoryArgs> = {
  title: "Chat/Orb reasoning",
  parameters: { chatSurface: false },
  argTypes: {
    busy: { control: "boolean" },
    tokenInterval: { control: { type: "range", min: 20, max: 300, step: 10 } },
  },
  args: { busy: false, tokenInterval: 70 },
};

export default meta;

const emptyAdapter = {
  async *sendMessage() {},
};

const script =
  "The user wants the orb to show live reasoning. " +
  "First, find where the circle composer renders its collapsed state.\n" +
  "The popover should sit above the orb and never cover the input. " +
  "Hover intent avoids flicker when the pointer passes over it.\n" +
  "Tokens append at the bottom; older lines fade toward the top so the newest thought stays readable. " +
  "Checking reduced motion next.";

const tokens: ReasoningChunk[] = (script.match(/\S+\s*|\n/g) ?? []).map((text, index) => ({
  id: `r${index}`,
  text,
}));

/** Streams `script` token by token, then loops after a pause. */
const useStreamingReasoning = (interval: number) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setCount((value) => (value >= tokens.length + 12 ? 0 : value + 1)),
      count >= tokens.length ? 400 : interval,
    );
    return () => window.clearTimeout(timer);
  }, [count, interval]);
  const reasoning = tokens.slice(0, Math.min(count, tokens.length));
  const state: ComposerOrbState = count > 0 && count <= tokens.length ? "thinking" : "idle";
  return { reasoning, state };
};

const busyRows = Array.from({ length: 24 }, (_, index) => ({
  tool: ["read_file", "run_tests", "grep", "apply_patch"][index % 4],
  detail: `packages/chat/src/components/Chat/chat.${["tsx", "css", "input.tsx", "select.tsx"][index % 4]}`,
  meta: `${(index * 37) % 210}ms`,
}));

/** Busy surface: dense tool rows in the theme's own muted foreground on its background. */
const BusyRows = () => (
  <ol className="storybook-orb-busy" aria-hidden="true">
    {busyRows.map((row, index) => (
      <li key={index}>
        <span>{row.tool}</span>
        <span>{row.detail}</span>
        <span>{row.meta}</span>
      </li>
    ))}
  </ol>
);

const OrbStage = ({ busy, state, reasoning }: { busy: boolean; state: ComposerOrbState; reasoning: readonly ReasoningChunk[] }) => {
  const { resolvedTheme } = useTheme();
  return (
    <ChatContextProvider adapter={emptyAdapter} registryUrl={noRegistryUrl}>
      <div className="chat-root storybook-orb-stage" data-theme={resolvedTheme} data-busy={busy ? "true" : "false"}>
        {busy ? (
          <BusyRows />
        ) : (
          <p className="storybook-orb-plain">Hover or Tab to the orb while it is thinking.</p>
        )}
        <div className="chat-composer">
          <ChatComposer collapsedVariant="circle" state={state} reasoning={reasoning} />
        </div>
      </div>
    </ChatContextProvider>
  );
};

/** Hover or Tab to the orb while it is thinking to read the live reasoning. */
export const ThinkingStreaming: StoryObj<OrbStoryArgs> = {
  name: "Thinking (streaming reasoning)",
  render: function Render({ busy, tokenInterval }) {
    const { reasoning, state } = useStreamingReasoning(tokenInterval);
    return <OrbStage busy={busy} state={state} reasoning={reasoning} />;
  },
};

/** A fixed reasoning snapshot, useful for visual checks. */
export const ThinkingStatic: StoryObj<OrbStoryArgs> = {
  name: "Thinking (static)",
  render: ({ busy }) => <OrbStage busy={busy} state="thinking" reasoning={tokens} />,
};

/** Idle orb: no popover regardless of hover. */
export const Idle: StoryObj<OrbStoryArgs> = {
  render: ({ busy }) => <OrbStage busy={busy} state="idle" reasoning={tokens} />,
};
