import React from "react";
import { Box, Text } from "ink";
import { useChat } from "./chat.context";
import { Spinner } from "./chat.spinner";

export function StatusBar() {
  const { status, threadId, provider, model, focus, isSending, threads } =
    useChat();

  const threadTitle =
    threads.find((thread) => thread.id === threadId)?.title ?? threadId ?? "—";

  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      justifyContent="space-between"
      gap={2}
    >
      <Box gap={2}>
        <Text bold color="green">
          chat-tui
        </Text>
        <Text dimColor>|</Text>
        <Text>
          <Text dimColor>thread </Text>
          <Text color="white">{threadTitle.slice(0, 28)}</Text>
        </Text>
        <Text dimColor>|</Text>
        <Text>
          <Text dimColor>model </Text>
          <Text color="yellow">
            {provider}/{model}
          </Text>
        </Text>
      </Box>
      <Box gap={2}>
        <Text dimColor>focus:{focus}</Text>
        {isSending ? (
          <Spinner
            label={status === "submitted" ? "sending" : "streaming"}
          />
        ) : (
          <Text color={status === "error" ? "red" : "green"}>{status}</Text>
        )}
      </Box>
    </Box>
  );
}
