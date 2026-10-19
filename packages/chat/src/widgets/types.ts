export type WidgetState =
  "running" | "complete" | "error" | "denied" | "approval";
/** Counts reported by the harness (Symphony `summary`); null means "not applicable". */
export type ToolSummary = {
  lines?: number | null;
  matches?: number | null;
  added?: number | null;
  removed?: number | null;
};
/** Timing and exit metadata from tool_execution_started/completed. All optional for old sessions. */
export type ToolRunInfo = {
  /** ISO timestamp from `started_at`; drives the live elapsed counter while running. */
  startedAt?: string;
  /** `duration_ms` from tool_execution_completed. */
  durationMs?: number | null;
  /** `exit_code` from tool_execution_completed. */
  exitCode?: number | null;
};
export type ToolWidgetProps = ToolRunInfo & {
  state?: WidgetState;
  error?: string;
  className?: string;
  summary?: ToolSummary;
};
export type TerminalStream = "stdout" | "stderr";
export type TerminalChunk = { stream: TerminalStream; text: string };
export type TerminalWidgetProps = ToolWidgetProps & {
  command: string;
  /** Streamed `tool_execution_output` deltas in arrival order. */
  chunks?: TerminalChunk[];
  /** Final result text, used when no chunks were streamed (older sessions). */
  output?: string;
  maxLines?: number;
};
export type ApprovalWidgetProps = {
  question: string;
  toolName?: string;
  target?: string;
  detail?: string;
  bytes?: number | null;
  /** Answer labels exactly as sent by the harness, e.g. Deny / Always allow / Allow once. */
  choices: string[];
  defaultChoice?: string;
  disabled?: boolean;
  onAnswer?: (choice: string) => void | Promise<void>;
  className?: string;
};
export type SubagentStepState = "running" | "complete" | "error";
/** One step of a child agent, linked to its parent call by `parent_call_id`. */
export type SubagentStep = {
  id: string;
  label: string;
  target?: string;
  meta?: string;
  state?: SubagentStepState;
  startedAt?: string;
  durationMs?: number | null;
};
export type ReadFileWidgetProps = ToolWidgetProps & {
  path: string;
  content?: string;
  startLine?: number;
  language?: string;
  maxLines?: number;
};
export type PatchWidgetProps = ToolWidgetProps & {
  path?: string;
  diff?: string;
  before?: string;
  after?: string;
  maxLines?: number;
};
export type SearchResult = {
  path: string;
  line?: number;
  text?: string;
  title?: string;
  url?: string;
};
export type SearchWidgetProps = ToolWidgetProps & {
  query: string;
  results?: SearchResult[];
  total?: number;
  maxResults?: number;
};
export type QuestionOption = {
  label: string;
  value: string;
  description?: string;
  recommended?: boolean;
};
export type QuestionAnswer = { values: string[]; text?: string };
/** A settled or open `ask_user` call. Choices render only while it is open. */
export type AskedWidgetProps = {
  question: string;
  answer?: string;
  choices?: string[];
  state?: WidgetState;
  error?: string;
  className?: string;
};
export type QuestionWidgetProps = {
  prompt: string;
  description?: string;
  options?: Array<string | QuestionOption>;
  multiple?: boolean;
  allowCustom?: boolean;
  disabled?: boolean;
  onSubmit?: (answer: QuestionAnswer) => void | Promise<void>;
  className?: string;
};
