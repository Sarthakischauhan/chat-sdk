import {
  parseContext,
  parseUsage,
  type AgentContext,
  type AgentDataPart,
} from "@sarchauhan/protocol";

const formatTokens = (value: number) => new Intl.NumberFormat("en-US").format(value);
const isTokenCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const getContextMetrics = (context: AgentContext | undefined) => {
  const currentTokens = context?.current_tokens;
  const contextWindow = context?.context_window;

  return isTokenCount(currentTokens) && isTokenCount(contextWindow)
    ? { currentTokens, contextWindow }
    : null;
};

export const MessageUsage = ({ parts }: { parts: AgentDataPart[] }) => {
  const usage = parseUsage(parts.find((part) => part.name === "usage")?.data);
  const context = parseContext(parts.find((part) => part.name === "context")?.data);
  const contextMetrics = getContextMetrics(context);
  const tokenMetrics = usage
    ? [
        ["in", usage.input_tokens],
        ["out", usage.output_tokens],
        ["reasoning", usage.reasoning_tokens],
        ["total", usage.total_tokens],
      ].filter((metric): metric is [string, number] => isTokenCount(metric[1]))
    : [];

  if (!contextMetrics && tokenMetrics.length === 0) return null;

  return (
    <p className="chat-message-usage" aria-label="Context and token usage">
      {contextMetrics ? (
        <>
          Context {formatTokens(contextMetrics.currentTokens)} / {formatTokens(contextMetrics.contextWindow)} ({Math.round((contextMetrics.currentTokens / contextMetrics.contextWindow) * 100)}%)
        </>
      ) : null}
      {tokenMetrics.length > 0 ? (
        <>
          {contextMetrics ? " · " : null}
          Tokens {tokenMetrics.map(([label, value]) => `${label} ${formatTokens(value)}`).join(" · ")}
        </>
      ) : null}
    </p>
  );
};
