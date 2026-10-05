import type { AgentEvent } from "@sarchauhan/protocol";

type SymphonyEvent = {
  event_type: string;
  payload: Record<string, unknown>;
};

type SubagentStatus = "running" | "completed" | "failed" | "cancelled";

type SubagentTimelineEvent = {
  id: string;
  kind: "status" | "reasoning" | "tool" | "message";
  label: string;
  detail?: unknown;
  status?: "running" | "completed" | "failed";
};

type SubagentState = {
  childId: string;
  label: string;
  prompt: string;
  modelId: string;
  parentId?: string;
  depth?: number;
  maxTurns?: number;
  status: SubagentStatus;
  phase: string;
  response: string;
  outputText: string;
  error: string;
  events: SubagentTimelineEvent[];
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

const appendText = (current: string, delta: unknown, maxLength = 12_000) =>
  `${current}${stringValue(delta)}`.slice(-maxLength);

const setTimelineEvent = (
  state: SubagentState,
  event: SubagentTimelineEvent,
) => {
  const index = state.events.findIndex((item) => item.id === event.id);
  if (index === -1) {
    state.events.push(event);
  } else {
    state.events[index] = event;
  }

  if (state.events.length > 12) {
    state.events.splice(0, state.events.length - 12);
  }
};

const subagentWidgetEvent = (state: SubagentState): AgentEvent => ({
  type: "data-widget",
  id: state.childId,
  data: {
    name: "subagent",
    props: {
      childId: state.childId,
      label: state.label,
      prompt: state.prompt,
      modelId: state.modelId,
      parentId: state.parentId,
      depth: state.depth,
      maxTurns: state.maxTurns,
      status: state.status,
      phase: state.phase,
      response: state.response,
      outputText: state.outputText,
      error: state.error,
      events: state.events.map((event) => ({ ...event })),
    },
  },
});

const createSubagentState = (
  childId: string,
  payload: Record<string, unknown>,
): SubagentState => ({
  childId,
  label: stringValue(payload.label) || "Subagent",
  prompt: stringValue(payload.prompt),
  modelId: stringValue(payload.model_id),
  parentId:
    stringValue(payload.agent_id) &&
    stringValue(payload.agent_id) !== stringValue(payload.run_id)
      ? stringValue(payload.agent_id)
      : undefined,
  depth: typeof payload.depth === "number" ? payload.depth : undefined,
  maxTurns: typeof payload.max_turns === "number" ? payload.max_turns : undefined,
  status: "running",
  phase: "Starting",
  response: "",
  outputText: "",
  error: "",
  events: [
    {
      id: "spawned",
      kind: "status",
      label: "Child agent started",
      status: "completed",
    },
  ],
});

const updateSubagentFromChildEvent = (
  state: SubagentState,
  event: SymphonyEvent,
): boolean => {
  const payload = event.payload;
  const turn = numberValue(payload.turn);
  const toolCallId = stringValue(payload.tool_call_id);

  switch (event.event_type) {
    case "run_started":
      state.phase = "Working";
      return true;
    case "turn_started":
      state.phase = `Turn ${turn || 1}`;
      return true;
    case "reasoning_delta": {
      const id = `reasoning-${turn}-${numberValue(payload.summary_index)}`;
      const previous = state.events.find((item) => item.id === id);
      setTimelineEvent(state, {
        id,
        kind: "reasoning",
        label: "Thinking",
        detail: appendText(typeof previous?.detail === "string" ? previous.detail : "", payload.delta, 4_000),
        status: "running",
      });
      state.phase = "Thinking";
      return previous === undefined;
    }
    case "text_delta": {
      const id = `message-${turn}`;
      const isFirstDelta = !state.events.some((item) => item.id === id);
      state.response = appendText(state.response, payload.delta);
      setTimelineEvent(state, {
        id,
        kind: "message",
        label: "Drafting response",
        status: "running",
      });
      state.phase = "Drafting response";
      return isFirstDelta;
    }
    case "tool_call_started":
      setTimelineEvent(state, {
        id: `tool-${toolCallId}`,
        kind: "tool",
        label: stringValue(payload.tool_name) || "Tool",
        status: "running",
      });
      state.phase = `Using ${stringValue(payload.tool_name) || "a tool"}`;
      return true;
    case "tool_execution_started": {
      const existing = state.events.find((item) => item.id === `tool-${toolCallId}`);
      setTimelineEvent(state, {
        id: `tool-${toolCallId}`,
        kind: "tool",
        label: stringValue(payload.tool_name) || existing?.label || "Tool",
        detail: parseValue(payload.arguments),
        status: "running",
      });
      return true;
    }
    case "tool_execution_completed": {
      const existing = state.events.find((item) => item.id === `tool-${toolCallId}`);
      const failed = stringValue(payload.status) !== "success";
      setTimelineEvent(state, {
        id: `tool-${toolCallId}`,
        kind: "tool",
        label: stringValue(payload.tool_name) || existing?.label || "Tool",
        detail: parseValue(payload.result),
        status: failed ? "failed" : "completed",
      });
      state.phase = failed ? "Tool failed" : "Working";
      return true;
    }
    case "tool_execution_failed": {
      const existing = state.events.find((item) => item.id === `tool-${toolCallId}`);
      setTimelineEvent(state, {
        id: `tool-${toolCallId}`,
        kind: "tool",
        label: stringValue(payload.tool_name) || existing?.label || "Tool",
        detail: stringValue(payload.message) || payload.error,
        status: "failed",
      });
      state.phase = "Tool failed";
      return true;
    }
    case "question_asked":
      setTimelineEvent(state, {
        id: `question-${stringValue(payload.question_id) || turn}`,
        kind: "status",
        label: "Waiting for input",
        detail: payload.question,
        status: "running",
      });
      state.phase = "Waiting for input";
      return true;
    case "turn_completed":
      for (const item of state.events) {
        if (item.status === "running" && item.kind !== "status") {
          item.status = "completed";
        }
      }
      state.phase = "Working";
      return true;
    case "run_completed":
      state.phase = "Finishing";
      return true;
    case "run_cancelled":
      state.status = "cancelled";
      state.phase = "Cancelled";
      state.error = stringValue(payload.reason) || "Child agent cancelled";
      return true;
    case "run_failed":
      state.status = "failed";
      state.phase = "Failed";
      state.error = stringValue(payload.message) || "Child agent failed";
      return true;
    case "run_limit_exceeded":
      state.status = "failed";
      state.phase = "Limit reached";
      state.error = stringValue(payload.message) || "Child agent reached a run limit";
      return true;
    default:
      return false;
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
  const spawnToolIds = new Set<string>();
  const subagents = new Map<string, SubagentState>();

  for await (const event of readSse(stream)) {
    const payload = event.payload;
    const turn = numberValue(payload.turn);
    const textId = `text-${turn}`;
    const childAgentId = stringValue(payload.agent_id);

    // Lifecycle events can be emitted by a child harness when it spawns its
    // own child. Handle these before routing ordinary child events by identity.
    if (event.event_type === "agent_spawned") {
      const childId = stringValue(payload.child_id);
      if (childId) {
        const state = createSubagentState(childId, payload);
        subagents.set(childId, state);
        yield subagentWidgetEvent(state);
      }
      continue;
    }

    if (event.event_type === "agent_completed") {
      const childId = stringValue(payload.child_id);
      if (childId) {
        const state = subagents.get(childId) ?? createSubagentState(childId, payload);
        state.status = "completed";
        state.phase = "Completed";
        state.outputText = stringValue(payload.output_text) || state.response;
        for (const item of state.events) {
          if (item.status === "running") item.status = "completed";
        }
        subagents.set(childId, state);
        yield subagentWidgetEvent(state);
      }
      continue;
    }

    if (event.event_type === "agent_failed") {
      const childId = stringValue(payload.child_id);
      if (childId) {
        const state = subagents.get(childId) ?? createSubagentState(childId, payload);
        const message = stringValue(payload.message) || "Child agent failed";
        state.status = message.toLowerCase().includes("cancel") ? "cancelled" : "failed";
        state.phase = state.status === "cancelled" ? "Cancelled" : "Failed";
        state.error = message;
        subagents.set(childId, state);
        yield subagentWidgetEvent(state);
      }
      continue;
    }

    if (stringValue(payload.parent_id) && childAgentId) {
      const state =
        subagents.get(childAgentId) ?? createSubagentState(childAgentId, payload);
      subagents.set(childAgentId, state);
      if (updateSubagentFromChildEvent(state, event)) {
        yield subagentWidgetEvent(state);
      }
      continue;
    }

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
        if (stringValue(payload.tool_name) === "spawn_agent") {
          spawnToolIds.add(stringValue(payload.tool_call_id));
          break;
        }
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
        if (spawnToolIds.has(stringValue(payload.tool_call_id))) {
          break;
        }
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
        if (spawnToolIds.has(stringValue(payload.tool_call_id))) {
          break;
        }
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
        if (spawnToolIds.has(stringValue(payload.tool_call_id))) {
          spawnToolIds.delete(stringValue(payload.tool_call_id));
          break;
        }
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

      case "run_limit_exceeded": {
        const message = stringValue(payload.message) || "Symphony run limit exceeded";
        yield { type: "error", errorText: message };
        throw new Error(message);
      }

      case "run_failed": {
        const message = stringValue(payload.message) || "Symphony run failed";
        yield { type: "error", errorText: message };
        throw new Error(message);
      }
    }
  }
}
