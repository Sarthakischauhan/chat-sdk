import React from "react";
import { Box, Text } from "ink";
import { useChat } from "./chat.context";

const SHORTCUTS = [
  ["Enter", "Send message"],
  ["Esc", "Stop stream / close overlay"],
  ["Ctrl+T", "Focus threads"],
  ["Ctrl+L", "Focus messages (scroll)"],
  ["Ctrl+K", "Focus composer"],
  ["Ctrl+M", "Model picker"],
  ["Ctrl+N", "New thread"],
  ["Ctrl+D", "Delete thread"],
  ["?", "Toggle help"],
  ["↑ / ↓", "Navigate lists / scroll"],
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
      width={56}
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
      <Text dimColor>Press Esc or ? to close</Text>
    </Box>
  );
}
