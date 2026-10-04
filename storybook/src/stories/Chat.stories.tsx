import {
  Chat,
  useTheme,
} from "@sarchauhan/chat";
import type { Meta, StoryObj } from "@storybook/react";
import {
  createScriptedAdapter,
  existingThreadAdapter,
  interactiveAdapter,
  noRegistryUrl,
  type StreamStep,
} from "../mocks/adapter";
import { storybookWidgets } from "../mocks/widgets";

type ChatStoryArgs = {
  height: number;
  width: number;
};

const meta: Meta<ChatStoryArgs> = {
  title: "Chat/Conversations",
  parameters: { chatSurface: false },
  tags: ["autodocs"],
  argTypes: {
    height: {
      control: { type: "range", min: 420, max: 760, step: 20 },
      description: "Fixed preview height in pixels.",
    },
    width: {
      control: { type: "range", min: 320, max: 960, step: 16 },
      description:
        "Fixed preview width in pixels. It stays capped to the visible viewport rather than stretching with the canvas.",
    },
  },
  args: {
    height: 576,
    width: 768,
  },
};

export default meta;

const StoryChat = (props: React.ComponentProps<typeof Chat>) => {
  const { theme } = useTheme();
  return <Chat {...props} theme={theme} />;
};

const chatStyle = (width: number, height: number) => ({ width, height });

export const Interactive: StoryObj<ChatStoryArgs> = {
  name: "Interactive streaming",
  render: ({ height, width }) => (
    <StoryChat
      adapter={interactiveAdapter}
      registryUrl={noRegistryUrl}
      showThemeToggle={false}
      className="storybook-chat-surface"
      style={chatStyle(width, height)}
    />
  ),
};

const widgetScript = (userText: string): StreamStep[] => {
  const question = userText.slice(0, 48);

  return [
    {
      wait: 300,
      parts: [{ type: "reasoning", state: "streaming", text: `Thinking about “${question}”…` }],
    },
    {
      wait: 600,
      parts: [
        { type: "reasoning", state: "done", text: `Thinking about “${question}”…` },
        { type: "text", state: "streaming", text: "Got it. Quick question before I finalize —" },
      ],
    },
    {
      wait: 600,
      parts: [
        { type: "reasoning", state: "done", text: `Thinking about “${question}”…` },
        { type: "text", state: "done", text: "Got it. Quick question before I finalize —" },
        {
          type: "widget",
          name: "poll",
          id: "widget_poll_1",
          props: {
            question: "Which language for the new service?",
            options: ["TypeScript", "Go", "Rust"],
          },
          interactive: true,
        },
        {
          type: "data",
          name: "usage",
          data: { input_tokens: 310, output_tokens: 88, reasoning_tokens: 39, total_tokens: 437 },
        },
        {
          type: "data",
          name: "context",
          data: { current_tokens: 1822, context_window: 200000 },
        },
      ],
    },
  ];
};

export const WidgetInteraction: StoryObj<ChatStoryArgs> = {
  render: ({ height, width }) => (
    <StoryChat
      adapter={createScriptedAdapter(widgetScript)}
      registryUrl={noRegistryUrl}
      widgets={storybookWidgets}
      showThemeToggle={false}
      className="storybook-chat-surface"
      style={chatStyle(width, height)}
    />
  ),
};

export const ExistingConversation: StoryObj<ChatStoryArgs> = {
  render: ({ height, width }) => (
    <StoryChat
      adapter={existingThreadAdapter}
      registryUrl={noRegistryUrl}
      defaultThreadId="storybook-thread"
      showThemeToggle={false}
      className="storybook-chat-surface"
      style={chatStyle(width, height)}
    />
  ),
};

const emptyAdapter = {
  sendMessage: async function* () {},
};

export const EmptyConversation: StoryObj<ChatStoryArgs> = {
  render: ({ height, width }) => (
    <StoryChat
      adapter={emptyAdapter}
      registryUrl={noRegistryUrl}
      showThemeToggle={false}
      className="storybook-chat-surface"
      style={chatStyle(width, height)}
    />
  ),
};

/** Expanded pill with the model picker visible. Export name is the stable id suffix. */
export const Expanded: StoryObj<ChatStoryArgs> = {
  name: "Expanded composer",
  render: ({ height, width }) => (
    <StoryChat
      adapter={emptyAdapter}
      registryUrl={noRegistryUrl}
      showThemeToggle={false}
      defaultExpanded
      className="storybook-chat-surface"
      style={chatStyle(width, height)}
    />
  ),
};

/** Opt-in circle. Export name is the stable Storybook id suffix. */
export const CollapsedCircle: StoryObj<ChatStoryArgs> = {
  name: "Collapsed circle",
  render: ({ height, width }) => (
    <StoryChat
      adapter={emptyAdapter}
      registryUrl={noRegistryUrl}
      showThemeToggle={false}
      collapsedVariant="circle"
      className="storybook-chat-surface"
      style={chatStyle(width, height)}
    />
  ),
};
