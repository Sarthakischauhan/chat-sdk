/**
 * Streaming agent events compatible with the AI SDK UI message stream protocol.
 * These are the discrete chunks an agent emits while running.
 */

export type AgentFinishReason =
  | "stop"
  | "length"
  | "content-filter"
  | "tool-calls"
  | "error"
  | "other";

export type AgentTextStartEvent = {
  type: "text-start";
  id: string;
};

export type AgentTextDeltaEvent = {
  type: "text-delta";
  id: string;
  delta: string;
};

export type AgentTextEndEvent = {
  type: "text-end";
  id: string;
};

export type AgentReasoningStartEvent = {
  type: "reasoning-start";
  id: string;
};

export type AgentReasoningDeltaEvent = {
  type: "reasoning-delta";
  id: string;
  delta: string;
};

export type AgentReasoningEndEvent = {
  type: "reasoning-end";
  id: string;
};

export type AgentToolInputStartEvent = {
  type: "tool-input-start";
  toolCallId: string;
  toolName: string;
  providerExecuted?: boolean;
  dynamic?: boolean;
  title?: string;
};

export type AgentToolInputDeltaEvent = {
  type: "tool-input-delta";
  toolCallId: string;
  inputTextDelta: string;
};

export type AgentToolInputAvailableEvent = {
  type: "tool-input-available";
  toolCallId: string;
  toolName: string;
  input: unknown;
  providerExecuted?: boolean;
  dynamic?: boolean;
  title?: string;
};

export type AgentToolInputErrorEvent = {
  type: "tool-input-error";
  toolCallId: string;
  toolName: string;
  input: unknown;
  errorText: string;
  providerExecuted?: boolean;
  dynamic?: boolean;
  title?: string;
};

export type AgentToolApprovalRequestEvent = {
  type: "tool-approval-request";
  approvalId: string;
  toolCallId: string;
};

export type AgentToolOutputAvailableEvent = {
  type: "tool-output-available";
  toolCallId: string;
  output: unknown;
  providerExecuted?: boolean;
  dynamic?: boolean;
  preliminary?: boolean;
};

export type AgentToolOutputErrorEvent = {
  type: "tool-output-error";
  toolCallId: string;
  errorText: string;
  providerExecuted?: boolean;
  dynamic?: boolean;
};

export type AgentToolOutputDeniedEvent = {
  type: "tool-output-denied";
  toolCallId: string;
};

export type AgentSourceUrlEvent = {
  type: "source-url";
  sourceId: string;
  url: string;
  title?: string;
};

export type AgentSourceDocumentEvent = {
  type: "source-document";
  sourceId: string;
  mediaType: string;
  title: string;
  filename?: string;
};

export type AgentFileEvent = {
  type: "file";
  url: string;
  mediaType: string;
  filename?: string;
};

export type AgentDataEvent = {
  type: `data-${string}`;
  id?: string;
  data: unknown;
  transient?: boolean;
};

export type AgentStartStepEvent = {
  type: "start-step";
};

export type AgentFinishStepEvent = {
  type: "finish-step";
};

export type AgentStartEvent = {
  type: "start";
  messageId?: string;
  messageMetadata?: unknown;
};

export type AgentFinishEvent = {
  type: "finish";
  finishReason?: AgentFinishReason;
  messageMetadata?: unknown;
};

export type AgentErrorEvent = {
  type: "error";
  errorText: string;
};

export type AgentAbortEvent = {
  type: "abort";
  reason?: string;
};

export type AgentMessageMetadataEvent = {
  type: "message-metadata";
  messageMetadata: unknown;
};

export type AgentEvent =
  | AgentTextStartEvent
  | AgentTextDeltaEvent
  | AgentTextEndEvent
  | AgentReasoningStartEvent
  | AgentReasoningDeltaEvent
  | AgentReasoningEndEvent
  | AgentToolInputStartEvent
  | AgentToolInputDeltaEvent
  | AgentToolInputAvailableEvent
  | AgentToolInputErrorEvent
  | AgentToolApprovalRequestEvent
  | AgentToolOutputAvailableEvent
  | AgentToolOutputErrorEvent
  | AgentToolOutputDeniedEvent
  | AgentSourceUrlEvent
  | AgentSourceDocumentEvent
  | AgentFileEvent
  | AgentDataEvent
  | AgentStartStepEvent
  | AgentFinishStepEvent
  | AgentStartEvent
  | AgentFinishEvent
  | AgentErrorEvent
  | AgentAbortEvent
  | AgentMessageMetadataEvent;

export type AgentEventType = AgentEvent["type"];
