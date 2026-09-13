"use client";

import { Children, isValidElement, type ComponentPropsWithoutRef } from "react";
import { CodeMarkdown, type SupportedLanguage } from "@sarchauhan/code-markdown";
import ReactMarkdown from "react-markdown";
import type { PluggableList } from "unified";
import remarkGfm from "remark-gfm";

import { cn } from "../../lib/utils";
import { useTheme } from "../../theme/theme.context";
import { chatCodeThemes } from "./message.markdown.theme";

const markdownPlugins: { remark: PluggableList; rehype: PluggableList } = {
  remark: [remarkGfm],
  rehype: [],
};

const getCodeLanguage = (className?: string): SupportedLanguage => {
  const match = className?.match(/language-([\w-]+)/);
  return (match?.[1]?.toLowerCase() ?? "typescript") as SupportedLanguage;
};

const getTextContent = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(getTextContent).join("");
  }

  return "";
};

const MarkdownCodeBlock = ({
  code,
  language,
}: {
  code: string;
  language: SupportedLanguage;
}) => {
  const { resolvedTheme } = useTheme();

  return (
    <CodeMarkdown
      className="chat-code-markdown"
      language={language}
      theme={chatCodeThemes[resolvedTheme]}
      showCopyButton
      showLineNumbers
      showLanguage
    >
      {code}
    </CodeMarkdown>
  );
};

const MarkdownPre = ({ className, children }: ComponentPropsWithoutRef<"pre">) => {
  const child = Children.toArray(children)[0];
  const code = isValidElement<{ className?: string; children?: unknown }>(child)
    ? getTextContent(child.props.children)
    : getTextContent(children);
  const codeClassName = isValidElement<{ className?: string }>(child)
    ? child.props.className
    : undefined;

  return (
    <div className={cn("my-5", className)}>
      <MarkdownCodeBlock
        language={getCodeLanguage(codeClassName)}
        code={code.replace(/\n$/, "")}
      />
    </div>
  );
};

const markdownComponents = {
  a: ({ className, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a
      className={cn(
        "font-medium text-primary underline underline-offset-2 decoration-primary/30 decoration-1 hover:decoration-primary/70",
        className,
      )}
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    />
  ),
  p: ({ className, ...props }: ComponentPropsWithoutRef<"p">) => (
    <p
      className={cn("my-[0.85em] text-inherit chat-text-body first:mt-0 last:mb-0", className)}
      style={{ fontSize: "var(--chat-body-size)", lineHeight: "var(--chat-body-leading)" }}
      {...props}
    />
  ),
  h1: ({ className, ...props }: ComponentPropsWithoutRef<"h1">) => (
    <h1
      className={cn("mt-8 mb-3 chat-text-heading-1", className)}
      style={{
        fontSize: "var(--chat-heading-1-size)",
        lineHeight: "var(--chat-heading-1-leading)",
        fontWeight: "var(--chat-heading-1-weight)",
        letterSpacing: "var(--chat-heading-1-tracking)",
      }}
      {...props}
    />
  ),
  h2: ({ className, ...props }: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className={cn("mt-8 mb-3", className)}
      style={{
        fontSize: "var(--chat-fs-18)",
        lineHeight: "var(--chat-leading-tight)",
        fontWeight: "var(--chat-weight-semibold)",
        letterSpacing: "var(--chat-tracking-tight)",
      }}
      {...props}
    />
  ),
  h3: ({ className, ...props }: ComponentPropsWithoutRef<"h3">) => (
    <h3
      className={cn("mt-6 mb-2", className)}
      style={{
        fontSize: "var(--chat-fs-16)",
        lineHeight: "var(--chat-leading-tight)",
        fontWeight: "var(--chat-weight-semibold)",
        letterSpacing: "var(--chat-tracking-tight)",
      }}
      {...props}
    />
  ),
  h4: ({ className, ...props }: ComponentPropsWithoutRef<"h4">) => (
    <h4
      className={cn("mt-6 mb-2", className)}
      style={{
        fontSize: "var(--chat-fs-15)",
        lineHeight: "var(--chat-leading-tight)",
        fontWeight: "var(--chat-weight-semibold)",
        letterSpacing: "var(--chat-tracking-normal)",
      }}
      {...props}
    />
  ),
  ul: ({ className, ...props }: ComponentPropsWithoutRef<"ul">) => (
    <ul
      className={cn("my-4 list-disc space-y-2 pl-6 chat-text-body", className)}
      style={{ fontSize: "var(--chat-body-size)", lineHeight: "var(--chat-body-leading)" }}
      {...props}
    />
  ),
  ol: ({ className, ...props }: ComponentPropsWithoutRef<"ol">) => (
    <ol
      className={cn("my-4 list-decimal space-y-2 pl-6 chat-text-body", className)}
      style={{ fontSize: "var(--chat-body-size)", lineHeight: "var(--chat-body-leading)" }}
      {...props}
    />
  ),
  li: ({ className, ...props }: ComponentPropsWithoutRef<"li">) => (
    <li
      className={cn("pl-1", className)}
      style={{ lineHeight: "var(--chat-leading-normal)" }}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className={cn("md-blockquote", className)} {...props} />
  ),
  hr: ({ className, ...props }: ComponentPropsWithoutRef<"hr">) => (
    <hr className={cn("my-6 h-px border-0 bg-current opacity-10", className)} {...props} />
  ),
  table: ({ className, ...props }: ComponentPropsWithoutRef<"table">) => (
    <div className="md-table-wrapper">
      <table className={cn("md-table", className)} {...props} />
    </div>
  ),
  thead: ({ className, ...props }: ComponentPropsWithoutRef<"thead">) => <thead {...props} />,
  tbody: ({ className, ...props }: ComponentPropsWithoutRef<"tbody">) => <tbody {...props} />,
  tr: ({ className, ...props }: ComponentPropsWithoutRef<"tr">) => <tr {...props} />,
  th: ({ className, ...props }: ComponentPropsWithoutRef<"th">) => <th {...props} />,
  td: ({ className, ...props }: ComponentPropsWithoutRef<"td">) => <td {...props} />,
  pre: MarkdownPre,
  // React Markdown v10 no longer consistently provides the legacy `inline`
  // prop. Fenced code is handled by the custom `pre` renderer above, so a
  // standalone `code` element should always be rendered as inline code.
  code: ({ className, children, ...props }: ComponentPropsWithoutRef<"code">) => (
    <code className={cn("md-inline-code", className)} {...props}>
      {children}
    </code>
  ),
};

type MarkdownContentProps = {
  children: string;
  className?: string;
};

export const MarkdownContent = ({ children, className }: MarkdownContentProps) => (
  <div className={cn("md-content break-words text-inherit", className)}>
    <ReactMarkdown
      remarkPlugins={markdownPlugins.remark}
      rehypePlugins={markdownPlugins.rehype}
      components={markdownComponents}
    >
      {children}
    </ReactMarkdown>
  </div>
);
