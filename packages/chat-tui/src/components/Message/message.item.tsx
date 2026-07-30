import { Box, Text } from "ink";
import { normalizeAgentParts, type AgentPart } from "@sarchauhan/protocol";
import type { ChatMessage } from "../../types";

const formatUnknown = (value: unknown) => {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

function MessagePartView({ part }: { part: AgentPart }) {
  switch (part.type) {
    case "text":
      return <Text>{part.text}</Text>;
    case "reasoning":
      return (
        <Text dimColor italic>
          {part.text}
        </Text>
      );
    case "tool":
      return (
        <Text color="cyan">
          [tool:{part.toolName} {part.state}]
          {part.errorText ? ` ${part.errorText}` : ""}
          {part.output != null ? ` → ${formatUnknown(part.output)}` : ""}
        </Text>
      );
    case "step-start":
      return (
        <Text dimColor>
          ── step ──
        </Text>
      );
    case "source-url":
      return (
        <Text color="blue">
          [source] {part.title ?? part.url}
        </Text>
      );
    case "source-document":
      return (
        <Text color="blue">
          [doc] {part.title}
        </Text>
      );
    case "file":
      return (
        <Text color="magenta">
          [file] {part.filename ?? part.url}
        </Text>
      );
    case "data":
      return (
        <Text dimColor>
          [data:{part.name}] {formatUnknown(part.data)}
        </Text>
      );
    case "widget":
      return (
        <Text dimColor>
          [widget:{part.name}] {formatUnknown(part.props)}
        </Text>
      );
    case "unknown":
      return (
        <Text dimColor>
          [{part.rawType}]
        </Text>
      );
    default:
      return null;
  }
}

export function MessageItem({ message }: { message: ChatMessage }) {
  const parts = normalizeAgentParts(message.parts);
  const label = message.role === "user" ? "you" : message.role;
  const color = message.role === "user" ? "green" : "white";

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={color}>
        {label}
      </Text>
      {parts.map((part, index) => (
        <Box key={`${message.id}-${index}`} flexDirection="column">
          <MessagePartView part={part} />
        </Box>
      ))}
    </Box>
  );
}
