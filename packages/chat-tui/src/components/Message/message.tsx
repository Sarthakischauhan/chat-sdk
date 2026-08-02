import { Box, Text } from "ink";
import { useChat } from "../Chat/chat.context";
import { MessageItem } from "./message.item";

export function MessageList() {
  const { messages, isLoadingThread } = useChat();

  if (isLoadingThread) {
    return (
      <Box>
        <Text dimColor>Loading conversation…</Text>
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold>How can I help?</Text>
        <Text dimColor>Type a message and press Enter. Esc stops a response.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </Box>
  );
}
