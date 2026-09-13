import React from "react";
import { Text } from "ink";
import { parseContext, parseUsage, type AgentDataPart } from "@sarchauhan/protocol";

const formatTokens = (value: number) => new Intl.NumberFormat("en-US").format(value);

export function MessageUsage({ part }: { part: AgentDataPart }) {
  if (part.name === "usage") {
    const usage = parseUsage(part.data);
    const tokens = usage
      ? [
          ["in", usage.input_tokens],
          ["out", usage.output_tokens],
          ["reasoning", usage.reasoning_tokens],
          ["total", usage.total_tokens],
        ].filter((metric): metric is [string, number] => typeof metric[1] === "number")
      : [];

    if (tokens.length === 0) {
      return null;
    }

    return (
      <Text dimColor>
        tokens {tokens.map(([label, value]) => `${label} ${formatTokens(value)}`).join(" · ")}
      </Text>
    );
  }

  if (part.name === "context" || part.name === "context-warning") {
    const context = parseContext(part.data);
    const currentTokens = context?.current_tokens;
    const contextWindow = context?.context_window;

    if (currentTokens === undefined || contextWindow === undefined) {
      return null;
    }

    return (
      <Text dimColor>
        {part.name === "context-warning" ? <Text color="yellow">⚠ </Text> : null}
        context {formatTokens(currentTokens)}/{formatTokens(contextWindow)} ({Math.round((currentTokens / contextWindow) * 100)}%)
      </Text>
    );
  }

  return null;
}
