"use client";
import type {
  ChatWidgetRegistry,
  WidgetComponentProps,
} from "../components/Widget/widget.context";
import { parseArtifact, parseSubagent } from "@sarchauhan/protocol";
import { ArtifactWidget, ArtifactsWidget } from "./artifact";
import { SubagentWidget } from "./subagent";
import { normalizeSearchResults } from "./compute";
import { PatchWidget } from "./patch";
import { QuestionWidget } from "./question";
import { ReadFileWidget } from "./read-file";
import { SearchWidget } from "./search";
import { TerminalWidget } from "./terminal";
import { ApprovalWidget } from "./approval";
import type {
  QuestionOption,
  SubagentStep,
  TerminalChunk,
  ToolSummary,
  ToolWidgetProps,
} from "./types";
const str = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const intOrNull = (value: unknown) =>
  value === null ? null : num(value);
const summaryOf = (value: unknown): ToolSummary | undefined =>
  isRecord(value)
    ? {
        lines: intOrNull(value.lines),
        matches: intOrNull(value.matches),
        added: intOrNull(value.added),
        removed: intOrNull(value.removed),
      }
    : undefined;
const chunksOf = (value: unknown): TerminalChunk[] =>
  Array.isArray(value)
    ? value.flatMap((item) =>
        isRecord(item) && typeof item.text === "string"
          ? [{ stream: item.stream === "stderr" ? "stderr" as const : "stdout" as const, text: item.text }]
          : [],
      )
    : [];
const stepsOf = (value: unknown): SubagentStep[] =>
  Array.isArray(value)
    ? value.flatMap((item) =>
        isRecord(item) && typeof item.id === "string" && typeof item.label === "string"
          ? [
              {
                id: item.id,
                label: item.label,
                target: typeof item.target === "string" ? item.target : undefined,
                meta: typeof item.meta === "string" ? item.meta : undefined,
                state:
                  item.state === "running" || item.state === "error"
                    ? item.state
                    : ("complete" as const),
                startedAt: typeof item.startedAt === "string" ? item.startedAt : undefined,
                durationMs: intOrNull(item.durationMs),
              },
            ]
          : [],
      )
    : [];
const common = (props: Record<string, unknown>): ToolWidgetProps => ({
  state:
    props.state === "running" ||
    props.state === "error" ||
    props.state === "denied" ||
    props.state === "approval"
      ? props.state
      : "complete",
  error: typeof props.error === "string" ? props.error : undefined,
  summary: summaryOf(props.summary),
  startedAt: typeof props.startedAt === "string" ? props.startedAt : undefined,
  durationMs: intOrNull(props.durationMs),
  exitCode: intOrNull(props.exitCode),
});
function Read(props: WidgetComponentProps) {
  return (
    <ReadFileWidget
      {...common(props)}
      path={str(props.path, "File")}
      content={typeof props.content === "string" ? props.content : undefined}
      startLine={num(props.startLine)}
      language={str(props.language)}
    />
  );
}
function Patch(props: WidgetComponentProps) {
  return (
    <PatchWidget
      {...common(props)}
      path={str(props.path, "File changes")}
      diff={typeof props.diff === "string" ? props.diff : undefined}
      before={typeof props.before === "string" ? props.before : undefined}
      after={typeof props.after === "string" ? props.after : undefined}
    />
  );
}
function Search(props: WidgetComponentProps) {
  return (
    <SearchWidget
      {...common(props)}
      query={str(props.query)}
      results={normalizeSearchResults(props.results)}
      total={num(props.total)}
    />
  );
}
function Question(props: WidgetComponentProps) {
  const options: QuestionOption[] = Array.isArray(props.options)
    ? props.options.flatMap((item) => {
        if (typeof item === "string") return [{ label: item, value: item }];
        if (
          !item ||
          typeof item !== "object" ||
          typeof item.label !== "string" ||
          typeof item.value !== "string"
        )
          return [];
        return [
          {
            label: item.label,
            value: item.value,
            description: str(item.description),
            recommended: item.recommended === true,
          },
        ];
      })
    : [];
  return (
    <QuestionWidget
      prompt={str(props.prompt, "Your answer")}
      description={str(props.description)}
      options={options}
      multiple={props.multiple === true}
      allowCustom={props.allowCustom === true}
      disabled={!props.widget.interactive || props.widget.disabled}
      onSubmit={async (answer) => {
        const labels = answer.values.map(
          (value) =>
            options.find((option) => option.value === value)?.label ?? value,
        );
        await props.widget.respond(
          answer,
          [...labels, answer.text].filter(Boolean).join(", "),
          "answer",
        );
      }}
    />
  );
}
function Terminal(props: WidgetComponentProps) {
  return (
    <TerminalWidget
      {...common(props)}
      command={str(props.command, "command")}
      chunks={chunksOf(props.chunks)}
      output={typeof props.output === "string" ? props.output : undefined}
    />
  );
}
function Approval(props: WidgetComponentProps) {
  const choices = Array.isArray(props.choices)
    ? props.choices.filter((choice): choice is string => typeof choice === "string")
    : [];
  return (
    <ApprovalWidget
      question={str(props.question, "Allow this action?")}
      toolName={typeof props.toolName === "string" ? props.toolName : undefined}
      target={typeof props.target === "string" ? props.target : undefined}
      detail={typeof props.detail === "string" ? props.detail : undefined}
      bytes={intOrNull(props.bytes)}
      choices={choices}
      defaultChoice={typeof props.default === "string" ? props.default : undefined}
      disabled={!props.widget.interactive || props.widget.disabled}
      onAnswer={(choice) => props.widget.respond(choice, choice, "answer")}
    />
  );
}
function Artifact(props: WidgetComponentProps) {
  const artifact = parseArtifact(props.artifact ?? props);
  return artifact ? <ArtifactWidget artifact={artifact} /> : <p className="chat-widget-empty">File details are unavailable.</p>;
}
function Artifacts(props: WidgetComponentProps) {
  const artifacts = Array.isArray(props.artifacts) ? props.artifacts.flatMap((value) => {
    const artifact = parseArtifact(value); return artifact ? [artifact] : [];
  }) : [];
  return <ArtifactsWidget artifacts={artifacts} />;
}
function Subagent(props: WidgetComponentProps) {
  const subagent = parseSubagent(props.subagent ?? props);
  return subagent ? <SubagentWidget subagent={subagent} steps={stepsOf(props.steps)} /> : <p className="chat-widget-empty">Agent details are unavailable.</p>;
}
/** Defaults are always available; a host registry can override any name. */
export const prebuiltWidgets: ChatWidgetRegistry = {
  artifact: { name: "artifact", component: Artifact, shell: false },
  artifacts: { name: "artifacts", component: Artifacts, shell: false },
  subagent: { name: "subagent", component: Subagent, shell: false },
  "read-file": { name: "read-file", component: Read, shell: false },
  patch: { name: "patch", component: Patch, shell: false },
  search: { name: "search", component: Search, shell: false },
  question: { name: "question", component: Question, shell: false },
  terminal: { name: "terminal", component: Terminal, shell: false },
  approval: { name: "approval", component: Approval, shell: false },
};
