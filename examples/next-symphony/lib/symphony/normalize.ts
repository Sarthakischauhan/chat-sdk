import type { AgentEvent } from "@sarchauhan/protocol";

type SymphonyEvent = {
  event_type: string;
  payload: Record<string, unknown>;
};

const numberValue = (value: unknown) =>
  typeof value === "number" ? value : 0;

const stringValue = (value: unknown) =>
  typeof value === "string" ? value : "";

const recordValue = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const parseValue = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

const askUserProps = (value: unknown) => {
  const input = recordValue(parseValue(value));
  const rawChoices = parseValue(input?.choices ?? input?.options);
  const choices = Array.isArray(rawChoices)
    ? rawChoices.flatMap((choice) => {
        if (typeof choice === "string") {
          return [{ label: choice, value: choice }];
        }

        const option = recordValue(choice);
        const label = stringValue(option?.label ?? option?.name ?? option?.value);
        const optionValue = stringValue(option?.value) || label;

        return label ? [{ label, value: optionValue }] : [];
      })
    : [];

  return {
    prompt: stringValue(input?.question ?? input?.prompt),
    options: choices,
    default: stringValue(input?.default ?? input?.default_option),
  };
};

async function* readSse(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SymphonyEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const frames = buffer.replaceAll("\r\n", "\n").split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

      if (data) {
        yield JSON.parse(data) as SymphonyEvent;
      }
    }

    if (done) {
      break;
    }
  }
}

export async function* normalizeSymphonyStream(
  stream: ReadableStream<Uint8Array>,
  messageId: string,
): AsyncGenerator<AgentEvent> {
  const textIds = new Set<string>();
  const reasoningIds = new Set<string>();
  const askUserToolIds = new Set<string>();

  for await (const event of readSse(stream)) {
    const payload = event.payload;
    const turn = numberValue(payload.turn);
    const textId = `text-${turn}`;

    switch (event.event_type) {
      case "run_started":
        yield {
          type: "start",
          messageId,
          messageMetadata: payload,
        };
        break;

      case "turn_started":
        yield { type: "start-step" };
        break;

      case "text_delta":
        if (!textIds.has(textId)) {
          textIds.add(textId);
          yield { type: "text-start", id: textId };
        }
        yield {
          type: "text-delta",
          id: textId,
          delta: stringValue(payload.delta),
        };
        break;

      case "reasoning_delta": {
        const reasoningId = `reasoning-${turn}-${numberValue(payload.summary_index)}`;
        if (!reasoningIds.has(reasoningId)) {
          reasoningIds.add(reasoningId);
          yield { type: "reasoning-start", id: reasoningId };
        }
        yield {
          type: "reasoning-delta",
          id: reasoningId,
          delta: stringValue(payload.delta),
        };
        break;
      }

      case "tool_call_started":
        if (stringValue(payload.tool_name) === "ask_user") {
          askUserToolIds.add(stringValue(payload.tool_call_id));
          break;
        }
        yield {
          type: "tool-input-start",
          toolCallId: stringValue(payload.tool_call_id),
          toolName: stringValue(payload.tool_name) || "unknown_tool",
        };
        break;

      case "tool_call_delta":
        if (askUserToolIds.has(stringValue(payload.tool_call_id))) {
          break;
        }
        yield {
          type: "tool-input-delta",
          toolCallId: stringValue(payload.tool_call_id),
          inputTextDelta: stringValue(payload.delta),
        };
        break;

      case "tool_execution_started":
        if (askUserToolIds.has(stringValue(payload.tool_call_id))) {
          yield {
            type: "data-widget",
            id: stringValue(payload.tool_call_id) || undefined,
            data: {
              name: "question",
              props: askUserProps(payload.arguments),
              interactive: true,
            },
          };
          break;
        }
        yield {
          type: "tool-input-available",
          toolCallId: stringValue(payload.tool_call_id),
          toolName: stringValue(payload.tool_name) || "unknown_tool",
          input: payload.arguments,
        };
        break;

      case "tool_execution_completed":
        if (askUserToolIds.has(stringValue(payload.tool_call_id))) {
          break;
        }
        yield {
          type: "tool-output-available",
          toolCallId: stringValue(payload.tool_call_id),
          output: parseValue(payload.result),
        };
        break;

      case "usage":
        yield { type: "data-usage", data: payload };
        break;

      case "context":
      case "context_warning":
        yield {
          type: `data-${event.event_type.replaceAll("_", "-")}`,
          data: payload,
        };
        break;

      case "turn_completed":
        if (textIds.has(textId)) {
          yield { type: "text-end", id: textId };
        }
        for (const id of reasoningIds) {
          if (id.startsWith(`reasoning-${turn}-`)) {
            yield { type: "reasoning-end", id };
          }
        }
        yield { type: "finish-step" };
        break;

      case "run_completed":
        yield {
          type: "finish",
          finishReason: "stop",
          messageMetadata: payload,
        };
        break;

      case "run_cancelled":
        yield { type: "abort", reason: stringValue(payload.reason) };
        break;

      case "run_failed": {
        const message = stringValue(payload.message) || "Symphony run failed";
        yield { type: "error", errorText: message };
        throw new Error(message);
      }
    }
  }
}
