import type { AgentEvent } from "./events";
import type {
  AgentDataPart,
  AgentFilePart,
  AgentPart,
  AgentReasoningPart,
  AgentSourceDocumentPart,
  AgentSourceUrlPart,
  AgentStepStartPart,
  AgentTextPart,
  AgentToolPart,
  AgentWidgetPart,
} from "./parts";

export const isTextPart = (part: AgentPart): part is AgentTextPart =>
  part.type === "text";

export const isReasoningPart = (part: AgentPart): part is AgentReasoningPart =>
  part.type === "reasoning";

export const isToolPart = (part: AgentPart): part is AgentToolPart =>
  part.type === "tool";

export const isStepStartPart = (part: AgentPart): part is AgentStepStartPart =>
  part.type === "step-start";

export const isSourceUrlPart = (part: AgentPart): part is AgentSourceUrlPart =>
  part.type === "source-url";

export const isSourceDocumentPart = (
  part: AgentPart,
): part is AgentSourceDocumentPart => part.type === "source-document";

export const isFilePart = (part: AgentPart): part is AgentFilePart =>
  part.type === "file";

export const isDataPart = (part: AgentPart): part is AgentDataPart =>
  part.type === "data";

export const isWidgetPart = (part: AgentPart): part is AgentWidgetPart =>
  part.type === "widget";

export const isAgentEvent = (value: unknown): value is AgentEvent => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const type = (value as { type?: unknown }).type;
  return typeof type === "string" && type.length > 0;
};

export const isDataEvent = (
  event: AgentEvent,
): event is Extract<AgentEvent, { type: `data-${string}` }> =>
  event.type.startsWith("data-");
