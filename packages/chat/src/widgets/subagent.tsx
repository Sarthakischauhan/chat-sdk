"use client";
import { createContext, useContext } from "react";
import { ArrowUpRight, Bot, X } from "lucide-react";
import type { AgentSubagent } from "@sarchauhan/protocol";
import { MessageContent } from "../components/Message/message.content";
import { ArtifactsWidget } from "./artifact";
import { ResponsiveDetail } from "./responsive-detail";

export type SubagentWidgetProps = {
  subagent: AgentSubagent;
  className?: string;
};
const Depth = createContext(0);
const labels = { queued: "Queued", running: "Working", completed: "Completed", failed: "Failed", cancelled: "Cancelled" };

export function SubagentWidget({ subagent, className = "" }: SubagentWidgetProps) {
  const depth = useContext(Depth);
  const { title, task, state, summary, progress, messages = [], artifacts = [], error } = subagent;
  const canInspect = depth < 3;
  const transcript = messages.filter((message) => message.role !== "system");
  const toolState = state === "failed" ? "error" : state === "cancelled" ? "denied" : state === "running" ? "running" : "complete";
  const row = (
    <button
      type="button"
      disabled={!canInspect}
      className="chat-subagent-trigger"
      aria-label={canInspect ? "View activity for " + title : "Subagent: " + title}
    >
      <span className="chat-tool-widget-glyph" aria-hidden="true">
        {state === "running" ? <span className="chat-tool-spinner" /> : state === "failed" || state === "cancelled" ? <X size={14} /> : <Bot size={14} />}
      </span>
      <span className="chat-tool-widget-label">Delegated</span>
      <span className="chat-tool-widget-title" title={title}>{title}</span>
      {state === "running" && progress !== undefined ? <span className="chat-tool-widget-meta">· {Math.round(progress * 100)}%</span> : null}
      <span className="chat-tool-widget-status" role="status">· {labels[state].toLowerCase()}</span>
      {canInspect ? <ArrowUpRight className="chat-subagent-open" size={12} aria-hidden="true" /> : null}
    </button>
  );
  return (
    <div className={`chat-prebuilt chat-tool-widget chat-subagent ${className}`} data-state={toolState} data-subagent-state={state}>
      {canInspect ? (
        <ResponsiveDetail title={title} description={task || "Subagent activity in this conversation"} trigger={row}>
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
        </ResponsiveDetail>
      ) : row}
    </div>
  );
}
