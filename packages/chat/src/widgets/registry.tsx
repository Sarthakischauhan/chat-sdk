"use client";
import type {
  ChatWidgetRegistry,
  WidgetComponentProps,
} from "../components/Widget/widget.context";
import { normalizeSearchResults } from "./compute";
import { PatchWidget } from "./patch";
import { QuestionWidget } from "./question";
import { ReadFileWidget } from "./read-file";
import { SearchWidget } from "./search";
import type { QuestionOption, ToolWidgetProps } from "./types";
const str = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const common = (props: Record<string, unknown>): ToolWidgetProps => ({
  state:
    props.state === "running" ||
    props.state === "error" ||
    props.state === "denied" ||
    props.state === "approval"
      ? props.state
      : "complete",
  error: typeof props.error === "string" ? props.error : undefined,
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
/** Defaults are always available; a host registry can override any name. */
export const prebuiltWidgets: ChatWidgetRegistry = {
  "read-file": { name: "read-file", component: Read, shell: false },
  patch: { name: "patch", component: Patch, shell: false },
  search: { name: "search", component: Search, shell: false },
  question: { name: "question", component: Question, shell: false },
};
