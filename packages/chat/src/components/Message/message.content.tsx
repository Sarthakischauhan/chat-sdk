import ReactMarkdown from "react-markdown";
import type { PluggableList } from "unified";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { splitThinkingSegments } from "../../lib/message/segment";
import { parseUserReferenceMessage } from "../../lib/message/user";

type TextPart = {
  type: "text";
  text: string;
};

type MessageContentProps = {
  parts: Array<TextPart | { type: string; [key: string]: unknown }>;
  isUser?: boolean;
};

const markdownPlugins: { remark: PluggableList; rehype: PluggableList } = {
  remark: [remarkGfm],
  rehype: [[rehypeHighlight, { detect: true, ignoreMissing: true }]],
};
const markdownComponents = {
  a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer noopener" />,
};

const MarkdownContent = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={markdownPlugins.remark}
      rehypePlugins={markdownPlugins.rehype}
      components={markdownComponents}
    >
      {children}
    </ReactMarkdown>
  );
};

const UserReferences = ({ references }: { references: string[] }) => {
  return (
    <div className="mb-3 flex flex-col gap-2">
      {references.map((reference, index) => (
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
  );
};

export const MessageContent = ({ parts, isUser = false }: MessageContentProps) => {
  const textContent = parts
    .filter((part): part is TextPart => part.type === "text")
    .map((part) => part.text)
    .join("\n");

  const userReferenceMessage = isUser ? parseUserReferenceMessage(textContent) : null;
  const content = userReferenceMessage?.message ?? textContent;
  const segments = splitThinkingSegments(content);

  return (
    <div className={`md-content ${isUser ? "md-content-user" : "md-content-assistant"}`}>
      {userReferenceMessage && <UserReferences references={userReferenceMessage.references} />}
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
                <span className={`md-thinking-indicator ${isComplete ? "" : "md-thinking-indicator-pending"}`} />
              </summary>
              {!!segment.content.trim() && (
                <div className="md-thinking-body">
                  <MarkdownContent>{segment.content}</MarkdownContent>
                </div>
              )}
            </details>
          );
        }

        return (
          <MarkdownContent key={`md-${index}`}>{segment.content}</MarkdownContent>
        );
      })}
    </div>
  );
};
