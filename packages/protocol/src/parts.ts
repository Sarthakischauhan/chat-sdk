/**
 * Normalized message parts used by the chat UI when rendering agent output.
 */

import type { AgentWidgetPart } from "./widgets";

export type { AgentWidgetPart, AgentWidgetProps } from "./widgets";

export type AgentStreamState = "streaming" | "done";

export type AgentToolState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied";

export type AgentTextPart = {
  type: "text";
  text: string;
  state?: AgentStreamState;
};

export type AgentReasoningPart = {
  type: "reasoning";
  text: string;
  state?: AgentStreamState;
};

export type AgentToolPart = {
  type: "tool";
  toolName: string;
  toolCallId: string;
  state: AgentToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  title?: string;
  providerExecuted?: boolean;
  preliminary?: boolean;
  approval?: {
    id: string;
    approved?: boolean;
    reason?: string;
  };
};

export type AgentStepStartPart = {
  type: "step-start";
};

export type AgentSourceUrlPart = {
  type: "source-url";
  sourceId: string;
  url: string;
  title?: string;
};

export type AgentSourceDocumentPart = {
  type: "source-document";
  sourceId: string;
  mediaType: string;
  title: string;
  filename?: string;
};

export type AgentFilePart = {
  type: "file";
  mediaType: string;
  url: string;
  filename?: string;
};

export type AgentDataPart = {
  type: "data";
  name: string;
  data: unknown;
  id?: string;
};

export type AgentUnknownPart = {
  type: "unknown";
  rawType: string;
  raw: Record<string, unknown>;
};

export type AgentPart =
  | AgentTextPart
  | AgentReasoningPart
  | AgentToolPart
  | AgentStepStartPart
  | AgentSourceUrlPart
  | AgentSourceDocumentPart
  | AgentFilePart
  | AgentDataPart
  | AgentWidgetPart
  | AgentUnknownPart;

export type AgentRole = "system" | "user" | "assistant";

export type AgentMessage = {
  id: string;
  role: AgentRole;
  parts: AgentPart[];
  metadata?: unknown;
};
