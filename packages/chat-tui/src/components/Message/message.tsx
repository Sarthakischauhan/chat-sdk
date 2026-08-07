import React from "react";
import { Box, Text, useStdout } from "ink";
import { useChat } from "../Chat/chat.context";
import { MessageItem } from "./message.item";

export function MessageList({
  height,
  showBorder = true,
}: {
  height?: number;
  showBorder?: boolean;
}) {
  const { messages, isLoadingThread, isSending, scrollOffset, focus, status } =
    useChat();
  const { stdout } = useStdout();
  const viewport = height ?? Math.max(8, (stdout?.rows ?? 24) - 12);

  if (isLoadingThread) {
    return (
      <Box>
        <Text dimColor>Loading conversation…</Text>
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle={showBorder ? "single" : undefined}
        borderColor={focus === "messages" ? "cyan" : "gray"}
        height={viewport}
        paddingX={1}
      >
        <Text bold>How can I help?</Text>
        <Text dimColor>Type a message and press Enter.</Text>
        <Text dimColor>Try /help for commands.</Text>
      </Box>
    );
  }

  const end = Math.max(0, messages.length - scrollOffset);
  const start = Math.max(0, end - viewport);
  const visible = messages.slice(start, end);
  const hiddenAbove = start;
  const hiddenBelow = scrollOffset;

  return (
    <Box
      flexDirection="column"
      borderStyle={showBorder ? "single" : undefined}
      borderColor={focus === "messages" ? "cyan" : "gray"}
      height={viewport}
      paddingX={1}
    >
      {hiddenAbove > 0 ? (
        <Text dimColor>↑ {hiddenAbove} earlier message(s)</Text>
      ) : null}
      {visible.map((message, index) => {
        const isLast = start + index === messages.length - 1;
        return (
          <MessageItem
            key={message.id}
            message={message}
            streaming={isSending && isLast && message.role === "assistant"}
          />
        );
      })}
      {hiddenBelow > 0 ? (
        <Text dimColor>↓ {hiddenBelow} newer message(s) · ↓ to follow</Text>
      ) : null}
      {status === "error" ? <Text color="red">Something went wrong.</Text> : null}
    </Box>
  );
}

/** React-style name for rendering the current conversation. */
export const Message = MessageList;
