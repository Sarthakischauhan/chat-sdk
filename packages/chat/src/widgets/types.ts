export type WidgetState =
  "running" | "complete" | "error" | "denied" | "approval";
export type ToolWidgetProps = {
  state?: WidgetState;
  error?: string;
  className?: string;
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
