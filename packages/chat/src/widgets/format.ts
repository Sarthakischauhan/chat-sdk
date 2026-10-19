import { useEffect, useState } from "react";
import type { ToolRunInfo, ToolSummary } from "./types";

export const formatDuration = (ms: number) =>
  ms < 1000 ? `${Math.round(ms)}ms` : ms < 60_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** Format a harness summary into a meta suffix. Returns undefined if nothing usable was sent. */
export function formatSummary(summary: ToolSummary | undefined, kind: "lines" | "matches"): string | undefined {
  const value = summary?.[kind];
  if (typeof value !== "number") return undefined;
  return kind === "lines" ? plural(value, "line", "lines") : plural(value, "match", "matches");
}

const startedMs = (startedAt?: string) => {
  if (!startedAt) return undefined;
  const ms = Date.parse(startedAt);
  return Number.isFinite(ms) ? ms : undefined;
};

/** Live elapsed time while running (from `started_at`); undefined when the payload lacks it. */
export function useElapsed(startedAt: string | undefined, running: boolean): number | undefined {
  const start = startedMs(startedAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running || start === undefined) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running, start]);
  return running && start !== undefined ? Math.max(0, now - start) : undefined;
}

const seconds = (ms: number) => `${Math.floor(ms / 1000)}s`;

/** Header status text from payload fields only; absent fields are hidden. */
export function formatStatus(
  state: string,
  { exitCode }: ToolRunInfo,
  elapsed?: number,
): { text: string; tone: "info" | "success" | "danger" | "warning" } | undefined {
  if (state === "running") return { text: elapsed === undefined ? "running" : `running ${seconds(elapsed)}`, tone: "info" };
  if (state === "error") return { text: typeof exitCode === "number" ? `failed, exit ${exitCode}` : "failed", tone: "danger" };
  if (state === "denied") return { text: "denied", tone: "danger" };
  if (state === "approval") return { text: "needs approval", tone: "warning" };
  if (exitCode === 0) return { text: "passed", tone: "success" };
  return undefined;
}
