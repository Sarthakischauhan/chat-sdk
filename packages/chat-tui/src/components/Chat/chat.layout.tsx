import React from "react";
import { Box, useStdout } from "ink";
import { useChat } from "./chat.context";
import { ChatComposer } from "./chat.composer";
import { HelpOverlay } from "./chat.help";
import { ModelPicker } from "./chat.model-picker";
import { StatusBar } from "./chat.status-bar";
import { ThreadList } from "./chat.thread-list";
import { MessageList } from "../Message/message";

export type ChatLayoutProps = {
  /** Use the linear coding-assistant layout (default) or the legacy panes. */
  mode?: "linear" | "classic";
  /** Show the thread sidebar when mode="classic" (default true). */
  showThreads?: boolean;
  /** Reserve this many rows for the composer and overlays. */
  footerHeight?: number;
};

/**
 * The standard full-screen chat layout. It is linear by default, with the
 * classic pane layout available for existing applications.
 */
export function ChatLayout({
  mode = "linear",
  showThreads = true,
  footerHeight = 8,
}: ChatLayoutProps) {
  if (mode === "classic") {
    return (
      <ClassicChatLayout
        showThreads={showThreads}
        footerHeight={footerHeight}
      />
    );
  }

  return <LinearChatLayout footerHeight={footerHeight} />;
}

function LinearChatLayout({ footerHeight }: { footerHeight: number }) {
  const { stdout } = useStdout();
  const { focus, showHelp } = useChat();
  const rows = stdout?.rows ?? 24;
  const messageHeight = Math.max(8, rows - footerHeight);

  return (
    <Box flexDirection="column" width="100%" height={rows}>
      <StatusBar />
      <Box flexGrow={1} flexDirection="column">
        <MessageList height={messageHeight} showBorder={false} />
      </Box>
      {focus === "threads" ? <ThreadList height={8} /> : null}
      {focus === "models" ? <ModelPicker /> : null}
      {showHelp ? <HelpOverlay /> : null}
      <Box flexDirection="column">
        <ChatComposer />
      </Box>
    </Box>
  );
}

function ClassicChatLayout({
  showThreads,
  footerHeight,
}: {
  showThreads: boolean;
  footerHeight: number;
}) {
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const messageHeight = Math.max(8, rows - footerHeight);

  return (
    <Box flexDirection="column" width="100%" height={rows}>
      <StatusBar />
      <Box flexGrow={1} flexDirection="row">
        {showThreads ? <ThreadList height={messageHeight} /> : null}
        <Box flexDirection="column" flexGrow={1}>
          <MessageList height={messageHeight} />
        </Box>
      </Box>
      <Box flexDirection="column">
        <ChatComposer />
      </Box>
      <Box justifyContent="center">
        <HelpOverlay />
      </Box>
      <Box justifyContent="center">
        <ModelPicker />
      </Box>
    </Box>
  );
}

/** A small alias that makes custom layouts read naturally in JSX. */
export const ChatShell = ChatLayout;
