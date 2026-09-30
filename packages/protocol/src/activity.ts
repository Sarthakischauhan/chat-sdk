import type { AgentMessage } from "./parts";
import { normalizeAgentParts } from "./normalize";
import type { AgentDataEvent } from "./events";

export type AgentArtifact = {
  id: string;
  filename: string;
  mediaType: string;
  /** Backend-owned download URL. Keep local filesystem paths out of this field. */
  url?: string;
  /** Optional inline text preview; never rendered as HTML. */
  content?: string;
  sizeBytes?: number;
  status?: "creating" | "ready" | "error";
  error?: string;
};
export type AgentSubagentState = "queued" | "running" | "completed" | "failed" | "cancelled";
export type AgentSubagent = {
  /** Stable run identity, namespace with the harness/session when necessary. */
  id: string;
  parentId?: string;
  title: string;
  task?: string;
  state: AgentSubagentState;
  summary?: string;
  error?: string;
  /** Fraction in [0, 1]; omit when the harness cannot estimate progress. */
  progress?: number;
  messages?: AgentMessage[];
  artifacts?: AgentArtifact[];
};
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const string = (value: unknown) => typeof value === "string" ? value : undefined;
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;

export function parseArtifact(value: unknown): AgentArtifact | null {
  if (!record(value) || typeof value.id !== "string" || !value.id.trim() ||
      typeof value.filename !== "string" || typeof value.mediaType !== "string") return null;
  const status = value.status === "creating" || value.status === "error" ? value.status : "ready";
  return {
    id: value.id, filename: value.filename, mediaType: value.mediaType,
    url: string(value.url), content: string(value.content), error: string(value.error),
    sizeBytes: finite(value.sizeBytes) !== undefined && Number(value.sizeBytes) >= 0 ? Number(value.sizeBytes) : undefined,
    status,
  };
}
export function parseSubagent(value: unknown): AgentSubagent | null {
  if (!record(value) || typeof value.id !== "string" || !value.id.trim() ||
      typeof value.title !== "string" ||
      !["queued", "running", "completed", "failed", "cancelled"].includes(String(value.state))) return null;
  const messages: AgentMessage[] | undefined = Array.isArray(value.messages)
    ? value.messages.flatMap((message) => {
        if (!record(message) || typeof message.id !== "string" ||
            !["user", "assistant", "system"].includes(String(message.role)) || !Array.isArray(message.parts)) return [];
        // Parts are normalized by the consuming renderer. Reject malformed envelopes here.
        const parts = normalizeAgentParts(message.parts.flatMap((part) => record(part) && typeof part.type === "string" ? [{ ...part, type: part.type }] : []));
        return [{ id: message.id, role: message.role as AgentMessage["role"], parts, metadata: message.metadata }];
      }) : undefined;
  const progress = finite(value.progress);
  return {
    id: value.id, parentId: string(value.parentId), title: value.title, task: string(value.task),
    state: value.state as AgentSubagentState, summary: string(value.summary), error: string(value.error),
    progress: progress === undefined ? undefined : Math.max(0, Math.min(1, progress)), messages,
    artifacts: Array.isArray(value.artifacts) ? value.artifacts.flatMap((artifact) => {
      const parsed = parseArtifact(artifact); return parsed ? [parsed] : [];
    }) : undefined,
  };
}
/** Full snapshots replace the previous value for this ID; no new event family needed. */
export function createArtifactData(artifact: AgentArtifact): AgentDataEvent {
  return { type: "data-artifact", id: artifact.id, data: artifact };
}
export function createSubagentData(subagent: AgentSubagent): AgentDataEvent {
  return { type: "data-subagent", id: subagent.id, data: subagent };
}
