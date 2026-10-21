/**
 * Symphony session artifacts (stdio protocol 4, capability "artifacts").
 * Field names match the wire frames, which are snake_case.
 */

export const ARTIFACTS_CAPABILITY = "artifacts";
export const ARTIFACT_KINDS = ["html", "csv", "json", "image"] as const;
/** html is one .html file or a website folder whose entry is index.html. */
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export type ArtifactManifest = {
  /** 16 hex characters, stable across versions of one source. */
  id: string;
  kind: ArtifactKind;
  title: string;
  /** ISO 8601 UTC times of the first and the latest version. */
  created_at: string;
  updated_at: string;
  /** Latest version number, from 1. */
  version: number;
  /** The tool call that produced the latest version. */
  tool_call_id: string;
  /** Workspace path it came from, or `<tool_call_id>#image-<n>` for an inline image. */
  source: string;
  /** The file to open, relative to the artifact folder, e.g. "v2/index.html". */
  entry: string;
  mime: string;
  /** sha256 of the entry file; for a website, of its sorted file list. */
  sha256: string;
  /** Bytes in the version (every file of a website). */
  size: number;
};

/** Payload of the artifact/created and artifact/updated events. */
export type ArtifactEventPayload = ArtifactManifest & {
  /** Absolute path of the entry file on the host. */
  path: string;
};
export type ArtifactEvent = {
  type: "event";
  event: "artifact/created" | "artifact/updated";
  payload: ArtifactEventPayload;
};

export type ArtifactsListRequest = {
  type: "artifacts/list";
  request_id: string;
  /** Defaults to the worker's own session. */
  session_id?: string;
};
export type ArtifactsGetRequest = {
  type: "artifacts/get";
  request_id: string;
  session_id?: string;
  artifact_id: string;
};
export type ArtifactsListReply = {
  type: "artifacts";
  request_id: string;
  session_id: string;
  /** In creation order. */
  artifacts: ArtifactManifest[];
};
export type ArtifactGetReply = {
  type: "artifact";
  request_id: string;
  session_id: string;
  artifact: ArtifactManifest;
  /** Absolute path of the entry file on the host. */
  path: string;
  /** The latest version's files, relative to its version folder. */
  files: string[];
};

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isArtifactKind = (value: unknown): value is ArtifactKind =>
  typeof value === "string" && (ARTIFACT_KINDS as readonly string[]).includes(value);

/** A manifest from a frame, or null when a field is missing or mistyped. */
export function parseArtifactManifest(value: unknown): ArtifactManifest | null {
  if (!record(value) || !isArtifactKind(value.kind)) return null;
  const { id, title, created_at, updated_at, version, tool_call_id, source, entry, mime, sha256, size } = value;
  if (
    typeof id !== "string" || typeof title !== "string" || typeof created_at !== "string" ||
    typeof updated_at !== "string" || typeof tool_call_id !== "string" || typeof source !== "string" ||
    typeof entry !== "string" || typeof mime !== "string" || typeof sha256 !== "string" ||
    typeof version !== "number" || !Number.isInteger(version) || version < 1 ||
    typeof size !== "number" || !Number.isFinite(size) || size < 0
  )
    return null;
  return { id, kind: value.kind, title, created_at, updated_at, version, tool_call_id, source, entry, mime, sha256, size };
}
