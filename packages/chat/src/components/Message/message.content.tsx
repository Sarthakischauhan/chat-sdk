"use client";

import {
  normalizeAgentParts,
  parseArtifact,
  parseSubagent,
  type AgentDataPart,
  type AgentFilePart,
  type AgentPart,
  type AgentReasoningPart,
  type AgentSourceDocumentPart,
  type AgentSourceUrlPart,
  type AgentToolPart,
  type AgentWidgetPart,
  type AgentWidgetProps,
} from "@sarchauhan/protocol";
import { splitThinkingSegments } from "../../lib/message/segment";
import { parseUserReferenceMessage } from "../../lib/message/user";
import { cn } from "../../lib/utils";
import { ArtifactWidget } from "../../widgets/artifact";
import { computeToolWidget } from "../../widgets/compute";
import { GenericToolWidget } from "../../widgets/generic-tool";
import { prebuiltWidgets } from "../../widgets/registry";
import { useWidgets } from "../Widget/widget.context";
import { TextSkeleton } from "./message.skeleton";
import { WidgetRenderer } from "../Widget/widget.renderer";
import { MarkdownContent } from "./message.markdown";
import { ThinkingBlock } from "./message.thinking";

type MessageContentProps = {
  parts: Array<{ type: string; [key: string]: unknown }>;
  isUser?: boolean;
};

const isPropsRecord = (value: unknown): value is AgentWidgetProps =>
  !!value && typeof value === "object" && !Array.isArray(value);

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

const ReasoningBlock = ({ part }: { part: AgentReasoningPart }) => {
  const isComplete = part.state !== "streaming";

  return (
    <ThinkingBlock isComplete={isComplete}>
      {!!part.text.trim() && (
        <div className="md-thinking-body">
          <MarkdownContent>{part.text}</MarkdownContent>
        </div>
      )}
    </ThinkingBlock>
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

const FileBlock = ({ part }: { part: AgentFilePart }) => (
  <ArtifactWidget artifact={{
    id: part.url, filename: part.filename || (part.mediaType.startsWith("image/") ? "Generated image" : "Generated file"),
    mediaType: part.mediaType, url: part.url, status: "ready",
  }} />
);

const AgentEventBlock = ({ part }: { part: AgentDataPart }) => (
  <details className="agent-tool agent-event">
    <summary>
      <span className="agent-event-marker" aria-hidden="true" />
      <span className="agent-tool-name">data.{part.name}</span>
    </summary>
    <div className="agent-tool-body">
      <pre className="agent-tool-code">{formatJson(part.data)}</pre>
    </div>
  </details>
);

const TextWithLegacyThinking = ({ text, isUser }: { text: string; isUser: boolean }) => {
  const userReferenceMessage = isUser ? parseUserReferenceMessage(text) : null;
  const content = userReferenceMessage?.message ?? text;
  const segments = splitThinkingSegments(content);

  return (
    <>
      {userReferenceMessage && (
        <div className="chat-user-reference">
          {userReferenceMessage.references.map((reference, index) => (
            <div
              key={`${index}-${reference.slice(0, 16)}`}
              className="chat-user-reference-item"
            >
              <div className="chat-reference-label">
                Reference {index + 1}
              </div>
              <div className="chat-reference-text">{reference}</div>
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
            <ThinkingBlock key={`thinking-${index}`} isComplete={isComplete}>
              {!!segment.content.trim() && (
                <div className="md-thinking-body">
                  <MarkdownContent>{segment.content}</MarkdownContent>
                </div>
              )}
            </ThinkingBlock>
          );
        }

        return <MarkdownContent key={`md-${index}`}>{segment.content}</MarkdownContent>;
      })}
    </>
  );
};

const asWidgetFromTool = (part: AgentToolPart): AgentWidgetPart | null => {
  const source =
    part.state === "output-available" && part.output !== undefined
      ? part.output
      : part.input;

  if (!isPropsRecord(source)) {
    return null;
  }

  return {
    type: "widget",
    name: part.toolName,
    id: part.toolCallId,
    props: source,
    interactive: part.toolName === "question" || source.interactive === true,
  };
};

const asWidgetFromData = (part: AgentDataPart): AgentWidgetPart => ({
  type: "widget",
  name: part.name,
  id: part.id,
  props: isPropsRecord(part.data) ? part.data : { value: part.data },
  interactive: isPropsRecord(part.data) ? part.data.interactive === true : false,
});

const PartView = ({ part, index, isUser }: { part: AgentPart; index: number; isUser: boolean }) => {
  const { widgets } = useWidgets();

  if (part.type === "widget") {
    return isUser ? null : <WidgetRenderer key={`widget-${part.id || index}`} part={part} />;
  }

  if (part.type === "tool" && !isUser) {
    const entry = widgets[part.toolName];
    const isCustom = entry && entry !== prebuiltWidgets[part.toolName];
    const widgetPart = isCustom ? asWidgetFromTool(part) : computeToolWidget(part);
    if (widgetPart) {
      return (
        <WidgetRenderer
          key={`tool-widget-${part.toolCallId || index}`}
          part={widgetPart}
          pending={part.state === "input-streaming"}
        />
      );
    }
  }

  if (part.type === "data" && !isUser && widgets[part.name]) {
    // Malformed builtin snapshots retain the generic data view. Host overrides remain unrestricted.
    const builtin = widgets[part.name] === prebuiltWidgets[part.name];
    if (builtin && ((part.name === "artifact" && !parseArtifact(part.data)) ||
        (part.name === "subagent" && !parseSubagent(part.data)))) return <AgentEventBlock part={part} />;
    return (
      <WidgetRenderer
        key={`data-widget-${part.name}-${part.id || index}`}
        part={asWidgetFromData(part)}
      />
    );
  }

  switch (part.type) {
    case "text":
      if (!isUser && part.state === "streaming" && part.text.trim().length === 0) {
        return <TextSkeleton key={`text-${index}`} />;
      }
      return <TextWithLegacyThinking key={`text-${index}`} text={part.text} isUser={isUser} />;
    case "reasoning":
      return isUser ? null : <ReasoningBlock key={`reasoning-${index}`} part={part} />;
    case "tool":
      // Any tool without a prebuilt widget: the same row, with only its result as the body.
      return isUser ? null : (
        <div key={`tool-${part.toolCallId || index}`} className="chat-widget">
          <GenericToolWidget part={part} />
        </div>
      );
    case "source-url":
      return <SourceUrlBlock key={`source-url-${part.sourceId || index}`} part={part} />;
    case "source-document":
      return <SourceDocumentBlock key={`source-doc-${part.sourceId || index}`} part={part} />;
    case "file":
      return <FileBlock key={`file-${index}`} part={part} />;
    case "data":
      if (part.name === "usage" || part.name === "context" || part.name === "context-warning") {
        return null;
      }
      return <AgentEventBlock key={`data-${part.name}-${part.id || index}`} part={part} />;
    case "unknown":
      return (
        <details key={`unknown-${index}`} className="agent-tool agent-event">
          <summary>
            <span className="agent-event-marker" aria-hidden="true" />
            <span className="agent-tool-name">{part.rawType}</span>
          </summary>
          <div className="agent-tool-body">
            <pre className="agent-tool-code">{formatJson(part.raw)}</pre>
          </div>
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
        "chat-message-content break-words",
        isUser ? "md-content-user" : "md-content-assistant",
      )}
    >
      {agentParts.map((part, index) => (
        <PartView key={`${part.type}-${index}`} part={part} index={index} isUser={isUser} />
      ))}
    </div>
  );
};
