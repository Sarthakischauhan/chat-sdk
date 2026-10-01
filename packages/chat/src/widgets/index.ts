export { ReadFileWidget } from "./read-file";
export { PatchWidget } from "./patch";
export { SearchWidget } from "./search";
export { QuestionWidget } from "./question";
export { prebuiltWidgets } from "./registry";
export {
  computeToolWidget,
  computeToolState,
  computeDiff,
  computeTextDiff,
  normalizeSearchResults,
  safeResultUrl,
  type DiffLine,
} from "./compute";
export type {
  ReadFileWidgetProps,
  PatchWidgetProps,
  SearchWidgetProps,
  SearchResult,
  QuestionWidgetProps,
  QuestionOption,
  QuestionAnswer,
  ToolWidgetProps,
  WidgetState,
} from "./types";

export { ArtifactWidget, ArtifactsWidget, safeArtifactUrl, formatArtifactSize } from "./artifact";
export type { ArtifactWidgetProps, ArtifactsWidgetProps } from "./artifact";
export { SubagentWidget } from "./subagent";
export type { SubagentWidgetProps } from "./subagent";
export { ResponsiveDetail } from "./responsive-detail";
export type { ResponsiveDetailProps } from "./responsive-detail";
export { createArtifactData, createSubagentData, parseArtifact, parseSubagent } from "@sarchauhan/protocol";
export type { AgentArtifact, AgentSubagent, AgentSubagentState } from "@sarchauhan/protocol";
