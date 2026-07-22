"use client";

import {
  normalizeAgentParts,
  type AgentDataPart,
  type AgentFilePart,
  type AgentPart,
  type AgentReasoningPart,
  type AgentSourceDocumentPart,
  type AgentSourceUrlPart,
  type AgentToolPart,
} from "@your-scope/protocol";
import { splitThinkingSegments } from "../../lib/message/segment";
import { parseUserReferenceMessage } from "../../lib/message/user";
import { cn } from "../../lib/utils";
import { MarkdownContent } from "./message.markdown";

type MessageContentProps = {
  parts: Array<{ type: string; [key: string]: unknown }>;
  isUser?: boolean;
};

const formatJson = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const toolStateLabel = (state: AgentToolPart["state"]) => {
  switch (state) {
    case "input-streaming":
      return "Preparing";
    case "input-available":
      return "Ready";
    case "approval-requested":
      return "Needs approval";
    case "approval-responded":
      return "Approval sent";
    case "output-available":
      return "Done";
    case "output-error":
      return "Error";
    case "output-denied":
      return "Denied";
    default:
      return state;
  }
};

const ReasoningBlock = ({ part }: { part: AgentReasoningPart }) => {
  const isComplete = part.state !== "streaming";

  return (
    <details
      className={`md-thinking ${isComplete ? "md-thinking-complete" : "md-thinking-pending"}`}
      open={!isComplete}
    >
      <summary>
        <span className="md-thinking-label">{isComplete ? "Thought" : "Thinking"}</span>
        <span className={`md-thinking-indicator ${isComplete ? "" : "md-thinking-indicator-pending"}`} />
      </summary>
      {!!part.text.trim() && (
        <div className="md-thinking-body">
          <MarkdownContent>{part.text}</MarkdownContent>
        </div>
      )}
    </details>
  );
};

const ToolBlock = ({ part }: { part: AgentToolPart }) => {
  const isPending =
    part.state === "input-streaming" ||
    part.state === "input-available" ||
    part.state === "approval-requested";

  return (
    <details className={`agent-tool ${isPending ? "agent-tool-pending" : "agent-tool-complete"}`} open={isPending}>
      <summary>
        <span className="agent-tool-name">{part.title ?? part.toolName}</span>
        <span className="agent-tool-state">{toolStateLabel(part.state)}</span>
      </summary>
      <div className="agent-tool-body">
        {part.input !== undefined && (
          <div className="agent-tool-section">
            <div className="agent-tool-section-label">Input</div>
            <pre className="agent-tool-code">{formatJson(part.input)}</pre>
          </div>
        )}
        {part.output !== undefined && (
          <div className="agent-tool-section">
            <div className="agent-tool-section-label">Output</div>
            <pre className="agent-tool-code">{formatJson(part.output)}</pre>
          </div>
        )}
        {part.errorText && (
          <div className="agent-tool-section">
            <div className="agent-tool-section-label">Error</div>
            <pre className="agent-tool-code agent-tool-error">{part.errorText}</pre>
          </div>
        )}
      </div>
    </details>
  );
};

const SourceUrlBlock = ({ part }: { part: AgentSourceUrlPart }) => (
  <a className="agent-source" href={part.url} target="_blank" rel="noreferrer">
    <span className="agent-source-label">Source</span>
    <span className="agent-source-title">{part.title || part.url}</span>
  </a>
);

const SourceDocumentBlock = ({ part }: { part: AgentSourceDocumentPart }) => (
  <div className="agent-source agent-source-document">
    <span className="agent-source-label">Document</span>
    <span className="agent-source-title">{part.title}</span>
    {part.filename && <span className="agent-source-meta">{part.filename}</span>}
  </div>
);

const FileBlock = ({ part }: { part: AgentFilePart }) => {
  const isImage = part.mediaType.startsWith("image/");

  if (isImage) {
    return (
      <figure className="agent-file agent-file-image">
        <img src={part.url} alt={part.filename || "Generated file"} />
        {part.filename && <figcaption>{part.filename}</figcaption>}
      </figure>
    );
  }

  return (
    <a className="agent-file" href={part.url} target="_blank" rel="noreferrer">
      <span className="agent-source-label">File</span>
      <span className="agent-source-title">{part.filename || part.mediaType}</span>
    </a>
  );
};

const DataBlock = ({ part }: { part: AgentDataPart }) => (
  <details className="agent-data">
    <summary>
      <span className="agent-tool-name">data.{part.name}</span>
    </summary>
    <pre className="agent-tool-code">{formatJson(part.data)}</pre>
  </details>
);

const TextWithLegacyThinking = ({ text, isUser }: { text: string; isUser: boolean }) => {
  const userReferenceMessage = isUser ? parseUserReferenceMessage(text) : null;
  const content = userReferenceMessage?.message ?? text;
  const segments = splitThinkingSegments(content);

  return (
    <>
      {userReferenceMessage && (
        <div className="mb-3 flex flex-col gap-2">
          {userReferenceMessage.references.map((reference, index) => (
            <div
              key={`${index}-${reference.slice(0, 16)}`}
              className="rounded-md border border-zinc-300/80 bg-white/70 px-3 py-2 text-left text-sm dark:border-zinc-700 dark:bg-zinc-900/45"
            >
              <div className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Reference {index + 1}
              </div>
              <div className="line-clamp-3 break-words text-zinc-700 dark:text-zinc-200">
                {reference}
              </div>
            </div>
          ))}
        </div>
      )}
      {segments.map((segment, index) => {
        if (!segment.content.trim() && segment.type !== "thinking") {
          return null;
        }

        if (segment.type === "thinking" && !isUser) {
          const isComplete = segment.isComplete ?? true;

          return (
            <details
              key={`thinking-${index}`}
              className={`md-thinking ${isComplete ? "md-thinking-complete" : "md-thinking-pending"}`}
              open={!isComplete}
            >
              <summary>
                <span className="md-thinking-label">{isComplete ? "Thought" : "Thinking"}</span>
                <span
                  className={`md-thinking-indicator ${isComplete ? "" : "md-thinking-indicator-pending"}`}
                />
              </summary>
              {!!segment.content.trim() && (
                <div className="md-thinking-body">
                  <MarkdownContent>{segment.content}</MarkdownContent>
                </div>
              )}
            </details>
          );
        }

        return <MarkdownContent key={`md-${index}`}>{segment.content}</MarkdownContent>;
      })}
    </>
  );
};

const renderPart = (part: AgentPart, index: number, isUser: boolean) => {
  switch (part.type) {
    case "text":
      return <TextWithLegacyThinking key={`text-${index}`} text={part.text} isUser={isUser} />;
    case "reasoning":
      return isUser ? null : <ReasoningBlock key={`reasoning-${index}`} part={part} />;
    case "tool":
      return isUser ? null : <ToolBlock key={`tool-${part.toolCallId || index}`} part={part} />;
    case "step-start":
      return isUser ? null : (
        <div key={`step-${index}`} className="agent-step">
          Step
        </div>
      );
    case "source-url":
      return <SourceUrlBlock key={`source-url-${part.sourceId || index}`} part={part} />;
    case "source-document":
      return <SourceDocumentBlock key={`source-doc-${part.sourceId || index}`} part={part} />;
    case "file":
      return <FileBlock key={`file-${index}`} part={part} />;
    case "data":
      return <DataBlock key={`data-${part.name}-${part.id || index}`} part={part} />;
    case "unknown":
      return (
        <details key={`unknown-${index}`} className="agent-data">
          <summary>
            <span className="agent-tool-name">{part.rawType}</span>
          </summary>
          <pre className="agent-tool-code">{formatJson(part.raw)}</pre>
        </details>
      );
    default:
      return null;
  }
};

export const MessageContent = ({ parts, isUser = false }: MessageContentProps) => {
  const agentParts = normalizeAgentParts(parts);

  return (
    <div
      className={cn(
        "space-y-4 break-words text-[15px] leading-8 text-inherit",
        isUser ? "md-content-user" : "md-content-assistant",
      )}
    >
      {agentParts.map((part, index) => renderPart(part, index, isUser))}
    </div>
  );
};
