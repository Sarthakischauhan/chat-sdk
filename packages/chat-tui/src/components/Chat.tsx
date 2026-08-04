import React from "react";
import { Box, useStdout } from "ink";
import type { ChatAdapter } from "../types";
import type { ModelOption } from "./Chat/chat.types";
import { ChatProvider } from "./Chat/chat.context";
import { ChatComposer } from "./Chat/chat.composer";
import { HelpOverlay } from "./Chat/chat.help";
import { ModelPicker } from "./Chat/chat.model-picker";
import { StatusBar } from "./Chat/chat.status-bar";
import { ThreadList } from "./Chat/chat.thread-list";
import { MessageList } from "./Message/message";

export type ChatProps = {
  adapter: ChatAdapter;
  defaultThreadId?: string;
  defaultProvider?: string;
  defaultModel?: string;
  models?: ModelOption[];
  /** Show the thread sidebar (default true). */
  showThreads?: boolean;
};

/**
 * Terminal chat shell — same adapter contract as `@sarchauhan/chat`.
 */
export function Chat({
  adapter,
  defaultThreadId,
  defaultProvider,
  defaultModel,
  models,
  showThreads = true,
}: ChatProps) {
  return (
    <ChatProvider
      adapter={adapter}
      defaultThreadId={defaultThreadId}
      defaultProvider={defaultProvider}
      defaultModel={defaultModel}
      models={models}
    >
      <ChatLayout showThreads={showThreads} />
    </ChatProvider>
  );
}

function ChatLayout({ showThreads }: { showThreads: boolean }) {
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const messageHeight = Math.max(8, rows - 8);

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
