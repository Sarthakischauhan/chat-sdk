import React from "react";
import { Box, Text } from "ink";
import { useChat } from "./chat.context";

const SHORTCUTS = [
  ["Enter", "Send message / run command"],
  ["Esc", "Stop stream / close help"],
  ["↑ / ↓", "Scroll or navigate results"],
  ["/new", "Start a new conversation"],
  ["/model", "Choose or change the model"],
  ["/threads", "Browse conversations"],
  ["/clear", "Start a new conversation"],
  ["/delete", "Delete this conversation"],
  ["Ctrl+C", "Quit"],
] as const;

export function HelpOverlay() {
  const { showHelp } = useChat();

  if (!showHelp) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      width={64}
    >
      <Text bold color="cyan">
        Shortcuts
      </Text>
      <Box height={1} />
      {SHORTCUTS.map(([key, label]) => (
        <Box key={key} gap={2}>
          <Box width={14}>
            <Text color="yellow">{key}</Text>
          </Box>
          <Text>{label}</Text>
        </Box>
      ))}
      <Box height={1} />
      <Text dimColor>Press Esc or /help to close</Text>
    </Box>
  );
}
