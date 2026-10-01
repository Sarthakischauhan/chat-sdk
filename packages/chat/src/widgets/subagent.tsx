"use client";
import { createContext, useContext } from "react";
import { ArrowUpRight, CircleCheck, CircleX, LoaderCircle, Bot } from "lucide-react";
import type { AgentSubagent } from "@sarchauhan/protocol";
import { MessageContent } from "../components/Message/message.content";
import { ArtifactsWidget } from "./artifact";
import { ResponsiveDetail } from "./responsive-detail";

export type SubagentWidgetProps = { subagent: AgentSubagent; className?: string };
const Depth = createContext(0);
const labels = { queued: "Queued", running: "Working", completed: "Completed", failed: "Failed", cancelled: "Cancelled" };

export function SubagentWidget({ subagent, className = "" }: SubagentWidgetProps) {
  const depth = useContext(Depth);
  const { title, task, state, summary, progress, messages = [], artifacts = [], error } = subagent;
  const Icon = state === "completed" ? CircleCheck : state === "failed" ? CircleX : state === "running" ? LoaderCircle : Bot;
  const canInspect = depth < 3;
  const transcript = messages.filter((message) => message.role !== "system");
  return <section className={"chat-prebuilt chat-subagent " + className} data-state={state} aria-label={"Subagent: " + title}>
    <div className="chat-subagent-heading"><span className="chat-subagent-icon"><Icon size={18} aria-hidden="true" /></span>
      <div><strong>{title}</strong><span className="chat-subagent-state" role="status">{labels[state]}</span></div>
      {canInspect ? <ResponsiveDetail title={title} description={task || "Subagent activity in this conversation"}
        trigger={<button className="chat-subagent-inspect" type="button" aria-label={"View activity for " + title}>View activity<ArrowUpRight size={14} aria-hidden="true" /></button>}>
        <Depth.Provider value={depth + 1}>
          <div className="chat-subagent-overview"><span className="chat-subagent-state">{labels[state]}</span>
            {progress !== undefined ? <span>{Math.round(progress * 100)}%</span> : null}</div>
          {summary ? <p className="chat-subagent-summary">{summary}</p> : null}
          {error ? <p className="chat-widget-error" role="alert">{error}</p> : null}
          {transcript.length ? <div className="chat-subagent-transcript">{transcript.map((message) => <article className="chat-subagent-message" key={message.id}>
            <div className="chat-subagent-role">{message.role === "user" ? "Task" : title}</div>
            <MessageContent parts={message.parts} isUser={message.role === "user"} />
          </article>)}</div> : <p className="chat-widget-empty">{state === "queued" ? "Waiting to start." : state === "running" ? "Activity will appear as the agent works." : "No activity was recorded."}</p>}
          {artifacts.length ? <div className="chat-subagent-artifacts"><h4>Created files</h4><ArtifactsWidget artifacts={artifacts} /></div> : null}
        </Depth.Provider>
      </ResponsiveDetail> : null}
    </div>
    {task ? <p className="chat-subagent-task">{task}</p> : null}
    {summary ? <p className="chat-subagent-summary">{summary}</p> : null}
    {state === "running" && progress !== undefined ? <progress className="chat-subagent-progress" value={progress} max={1} aria-label={"Progress for " + title} /> : null}
    {state === "failed" && error ? <p className="chat-widget-error" role="alert">{error}</p> : null}
  </section>;
}
