/**
 * Usage / context payloads ride on `AgentDataPart.data` (`unknown`).
 * Parse before rendering so chat and chat-tui share one check.
 */

export type AgentUsage = {
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  total_tokens?: number;
};

export type AgentContext = {
  current_tokens?: number;
  context_window?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readToken = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const hasToken = (usage: AgentUsage) =>
  usage.input_tokens !== undefined ||
  usage.output_tokens !== undefined ||
  usage.reasoning_tokens !== undefined ||
  usage.total_tokens !== undefined;

export const parseUsage = (data: unknown): AgentUsage | undefined => {
  if (!isRecord(data)) {
    return undefined;
  }

  const usage: AgentUsage = {
    input_tokens: readToken(data.input_tokens),
    output_tokens: readToken(data.output_tokens),
    reasoning_tokens: readToken(data.reasoning_tokens),
    total_tokens: readToken(data.total_tokens),
  };

  return hasToken(usage) ? usage : undefined;
};

export const parseContext = (data: unknown): AgentContext | undefined => {
  if (!isRecord(data)) {
    return undefined;
  }

  const current_tokens = readToken(data.current_tokens);
  const context_window = readToken(data.context_window);

  if (current_tokens === undefined && context_window === undefined) {
    return undefined;
  }

  return { current_tokens, context_window };
};
