import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useChat } from "./chat.context";

export function ChatComposer() {
  const { sendMessage, stopResponse, isSending, status } = useChat();
  const [value, setValue] = useState("");

  useInput((input, key) => {
    if (key.escape) {
      stopResponse();
      return;
    }

    if (key.return) {
      if (isSending || !value.trim()) {
        return;
      }

      const text = value;
      setValue("");
      void sendMessage({ text });
      return;
    }

    if (key.backspace || key.delete) {
      setValue((current) => current.slice(0, -1));
      return;
    }

    if (key.ctrl || key.meta) {
      return;
    }

    if (input) {
      setValue((current) => current + input);
    }
  });

  const statusLabel =
    status === "streaming"
      ? "streaming…"
      : status === "submitted"
        ? "sending…"
        : status === "error"
          ? "error"
          : "ready";

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Box>
        <Text color="cyan">{"> "}</Text>
        <Text>{value}</Text>
        <Text color="gray">█</Text>
      </Box>
      <Text dimColor>
        {statusLabel} · enter send · esc stop · ctrl+c quit
      </Text>
    </Box>
  );
}
