import React from "react";
import { Box, Text } from "ink";
import { useChat } from "./chat.context";

export function ThreadList({ height = 12 }: { height?: number }) {
  const { threads, threadId, focus } = useChat();
  const active = focus === "threads";
  const selectedIndex = Math.max(
    0,
    threads.findIndex((thread) => thread.id === threadId),
  );
  const visibleCount = Math.max(3, height - 2);
  const start = Math.max(
    0,
    Math.min(selectedIndex - Math.floor(visibleCount / 2), threads.length - visibleCount),
  );
  const visible = threads.slice(start, start + visibleCount);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={active ? "cyan" : "gray"}
      width={28}
      height={height}
      paddingX={1}
    >
      <Text bold color={active ? "cyan" : undefined}>
        Threads {active ? "◀" : ""}
      </Text>
      {visible.map((thread) => {
        const selected = thread.id === threadId;
        return (
          <Text
            key={thread.id}
            color={selected ? "green" : undefined}
            bold={selected}
            inverse={active && selected}
          >
            {selected ? "• " : "  "}
            {(thread.title || thread.id).slice(0, 20)}
          </Text>
        );
      })}
      {threads.length === 0 ? <Text dimColor>No threads</Text> : null}
      <Box flexGrow={1} />
      <Text dimColor>n new · d del</Text>
    </Box>
  );
}

export function useThreadNavigation() {
  const { threads, threadId, selectThread, focus } = useChat();

  return {
    enabled: focus === "threads",
    move: async (direction: 1 | -1) => {
      if (threads.length === 0) {
        return;
      }
      const index = Math.max(
        0,
        threads.findIndex((thread) => thread.id === threadId),
      );
      const next = threads[(index + direction + threads.length) % threads.length];
      await selectThread(next.id);
    },
  };
}
