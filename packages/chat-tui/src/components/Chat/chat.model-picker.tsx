import React from "react";
import { Box, Text } from "ink";
import { useChat } from "./chat.context";

export function ModelPicker() {
  const { focus, models, model, setModel } = useChat();

  if (focus !== "models") {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
      width={48}
    >
      <Text bold color="yellow">
        Model picker
      </Text>
      <Box height={1} />
      {models.map((entry) => {
        const selected = entry.id === model;
        return (
          <Text
            key={`${entry.provider}:${entry.id}`}
            color={selected ? "green" : undefined}
            inverse={selected}
          >
            {selected ? "❯ " : "  "}
            {entry.provider}/{entry.label}
          </Text>
        );
      })}
      <Box height={1} />
      <Text dimColor>↑↓ choose · Enter confirm · Esc close</Text>
    </Box>
  );
}

export function useModelNavigation() {
  const { focus, models, model, setModel, setFocus, cycleModel } = useChat();

  return {
    enabled: focus === "models",
    move: (direction: 1 | -1) => {
      cycleModel(direction);
    },
    confirm: () => {
      const current = models.find((entry) => entry.id === model) ?? models[0];
      if (current) {
        setModel(current.id);
      }
      setFocus("composer");
    },
  };
}
