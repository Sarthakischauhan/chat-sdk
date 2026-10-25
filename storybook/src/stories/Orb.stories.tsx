import { Chat, useTheme, type ComposerOrbState } from "@sarchauhan/chat";
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

const tokens = script.match(/\S+\s*|\n/g) ?? [];

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
  const reasoning = tokens.slice(0, Math.min(count, tokens.length)).join("");
  const state: ComposerOrbState = count > 0 && count <= tokens.length ? "thinking" : "idle";
  return { reasoning, state };
};

const busyText = Array.from(
  { length: 40 },
  (_, index) => `Row ${index + 1} · build 4.${index} passed · latency ${(index * 37) % 210}ms · deploy queued`,
).join("\n");

const OrbStage = ({ busy, state, reasoning }: { busy: boolean; state: ComposerOrbState; reasoning: string }) => {
  const { theme } = useTheme();
  return (
    <div className="storybook-orb-stage" data-busy={busy ? "true" : "false"}>
      {busy ? <pre className="storybook-orb-busy" aria-hidden="true">{busyText}</pre> : null}
      <Chat
        adapter={emptyAdapter}
        registryUrl={noRegistryUrl}
        theme={theme}
        showThemeToggle={false}
        collapsedVariant="circle"
        state={state}
        reasoning={reasoning}
        className="storybook-chat-surface storybook-orb-chat"
        style={{ width: 520, height: 420 }}
      />
    </div>
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
  render: ({ busy }) => <OrbStage busy={busy} state="thinking" reasoning={script} />,
};

/** Idle orb: no popover regardless of hover. */
export const Idle: StoryObj<OrbStoryArgs> = {
  render: ({ busy }) => <OrbStage busy={busy} state="idle" reasoning={script} />,
};
