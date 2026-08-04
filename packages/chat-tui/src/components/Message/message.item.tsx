import React from "react";
import { Box, Text } from "ink";
import { normalizeAgentParts, type AgentPart } from "@sarchauhan/protocol";
import type { ChatMessage } from "../../types";
import { Spinner } from "../Chat/chat.spinner";

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
      return (
        <Text>
          {part.text}
          {part.state === "streaming" ? <Text color="cyan"> ▍</Text> : null}
        </Text>
      );
    case "reasoning":
      return (
        <Box flexDirection="column">
          <Text dimColor italic>
            thinking
          </Text>
          <Text dimColor>{part.text}</Text>
        </Box>
      );
    case "tool":
      return (
        <Box flexDirection="column">
          <Text color="cyan">
            ⚙ {part.toolName} <Text dimColor>({part.state})</Text>
          </Text>
          {part.errorText ? <Text color="red">{part.errorText}</Text> : null}
          {part.output != null ? (
            <Text dimColor>→ {formatUnknown(part.output).slice(0, 240)}</Text>
          ) : null}
        </Box>
      );
    case "step-start":
      return <Text dimColor>── step ──</Text>;
    case "source-url":
      return (
        <Text color="blue">
          ↗ {part.title ?? part.url}
        </Text>
      );
    case "source-document":
      return <Text color="blue">📄 {part.title}</Text>;
    case "file":
      return <Text color="magenta">📎 {part.filename ?? part.url}</Text>;
    case "data":
      return (
        <Text dimColor>
          data:{part.name} {formatUnknown(part.data).slice(0, 120)}
        </Text>
      );
    case "widget":
      return (
        <Text color="yellow">
          ▣ widget:{part.name} {formatUnknown(part.props).slice(0, 120)}
        </Text>
      );
    case "unknown":
      return <Text dimColor>[{part.rawType}]</Text>;
    default:
      return null;
  }
}

export function MessageItem({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming?: boolean;
}) {
  const parts = normalizeAgentParts(message.parts);
  const label = message.role === "user" ? "you" : message.role;
  const color = message.role === "user" ? "green" : "white";

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box gap={1}>
        <Text bold color={color}>
          {label}
        </Text>
        {streaming && message.role === "assistant" ? <Spinner /> : null}
      </Box>
      {parts.length === 0 && streaming ? (
        <Text dimColor>waiting for tokens…</Text>
      ) : (
        parts.map((part, index) => (
          <Box key={`${message.id}-${index}`} flexDirection="column">
            <MessagePartView part={part} />
          </Box>
        ))
      )}
    </Box>
  );
}
