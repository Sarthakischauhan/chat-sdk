"use client";
import { createContext, useContext } from "react";
import { ArrowUpRight, Bot, X } from "lucide-react";
import type { AgentSubagent } from "@sarchauhan/protocol";
import { MessageContent } from "../components/Message/message.content";
import { ArtifactsWidget } from "./artifact";
import { ResponsiveDetail } from "./responsive-detail";

export type SubagentWidgetProps = { subagent: AgentSubagent; className?: string };
const Depth = createContext(0);
const labels = { queued: "Queued", running: "Working", completed: "Completed", failed: "Failed", cancelled: "Cancelled" };

/** Render the full ordered messages snapshot, not just the final assistant answer. */
export function SubagentWidget({ subagent, className = "" }: SubagentWidgetProps) {
  const depth = useContext(Depth);
  const { title, task, state, summary, progress, messages = [], artifacts = [], error } = subagent;
  const canInspect = depth < 3;
  const transcript = messages.filter(message => message.role !== "system");
  const toolState = state === "failed" ? "error" : state === "cancelled" ? "denied" : state === "running" ? "running" : "complete";
  const row = <button type="button" disabled={!canInspect} className="chat-subagent-trigger" aria-label={canInspect ? "View activity for " + title : "Subagent: " + title}>
    <span className="chat-tool-widget-glyph" aria-hidden="true">{state === "running" ? <span className="chat-tool-spinner" /> : state === "failed" || state === "cancelled" ? <X size={14} /> : <Bot size={14} />}</span>
    <span className="chat-tool-widget-label">Delegated</span>
    <span className="chat-tool-widget-title" title={title}>{title}</span>
    {state === "running" && progress !== undefined ? <span className="chat-tool-widget-meta">· {Math.round(progress * 100)}%</span> : null}
    <span className="chat-tool-widget-status" role="status">· {labels[state].toLowerCase()}</span>
    {canInspect ? <ArrowUpRight className="chat-subagent-open" size={12} aria-hidden="true" /> : null}
  </button>;
  return <div className={`chat-prebuilt chat-tool-widget chat-subagent ${className}`} data-state={toolState} data-subagent-state={state}>
    {canInspect ? <ResponsiveDetail title={title} description="Subagent activity" trigger={row}>
      <Depth.Provider value={depth + 1}>
        <div className="chat-subagent-activity" aria-label="Subagent activity timeline">
          <div className="chat-subagent-overview">
            <span className="chat-subagent-state" role="status">{labels[state]}</span>
            {progress !== undefined ? <span>{Math.round(progress * 100)}%</span> : null}
          </div>
          {task && !transcript.some(message => message.role === "user" && message.parts.some(part => part.type === "text" && "text" in part && part.text === task)) ?
            <section className="chat-subagent-entry"><div className="chat-subagent-role">Task</div><p className="chat-subagent-task">{task}</p></section> : null}
          {transcript.map((message, index) => <section className="chat-subagent-entry" key={message.id + "-" + index}>
            <div className="chat-subagent-role">{message.role === "user" ? "Task" : title}</div>
            <MessageContent parts={message.parts} isUser={message.role === "user"} />
          </section>)}
          {!transcript.length && <p className="chat-subagent-unavailable">{state === "queued" ? "Waiting to start." : state === "running" ? "No activity events have been received yet." : "Only the final snapshot was provided. Intermediate messages were not recorded by the host."}</p>}
          {state !== "running" && summary && <section className="chat-subagent-entry chat-subagent-final"><div className="chat-subagent-role">Result</div><p className="chat-subagent-summary">{summary}</p></section>}
          {error && <section className="chat-subagent-entry chat-subagent-final"><div className="chat-subagent-role">Error</div><p className="chat-widget-error" role="alert">{error}</p></section>}
          {artifacts.length ? <section className="chat-subagent-entry chat-subagent-artifacts"><div className="chat-subagent-role">Created files</div><ArtifactsWidget artifacts={artifacts} /></section> : null}
        </div>
      </Depth.Provider>
    </ResponsiveDetail> : row}
  </div>;
}
