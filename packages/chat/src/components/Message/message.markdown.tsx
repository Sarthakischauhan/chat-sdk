import { Children, isValidElement, type ComponentPropsWithoutRef } from "react";
import { CodeMarkdown, type SupportedLanguage } from "@sarchauhan/code-markdown";
import ReactMarkdown from "react-markdown";
import type { PluggableList } from "unified";
import remarkGfm from "remark-gfm";

import { cn } from "../../lib/utils";

const markdownPlugins: { remark: PluggableList; rehype: PluggableList } = {
  remark: [remarkGfm],
  rehype: [],
};

const supportedCodeLanguages = new Set([
  "c",
  "h",
  "cpp",
  "cxx",
  "cc",
  "hpp",
  "hxx",
  "go",
  "javascript",
  "js",
  "jsx",
  "mjs",
  "python",
  "py",
  "rust",
  "rs",
  "typescript",
  "ts",
  "tsx",
]);

const getCodeLanguage = (className?: string): SupportedLanguage => {
  const match = className?.match(/language-([\w-]+)/);
  const language = match?.[1]?.toLowerCase();

  return language && supportedCodeLanguages.has(language)
    ? (language as SupportedLanguage)
    : "typescript";
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
    <p className={cn("my-0 text-[15px] leading-8 text-inherit", className)} {...props} />
  ),
  h1: ({ className, ...props }: ComponentPropsWithoutRef<"h1">) => (
    <h1 className={cn("mt-8 mb-3 text-2xl font-semibold tracking-tight", className)} {...props} />
  ),
  h2: ({ className, ...props }: ComponentPropsWithoutRef<"h2">) => (
    <h2 className={cn("mt-8 mb-3 text-xl font-semibold tracking-tight", className)} {...props} />
  ),
  h3: ({ className, ...props }: ComponentPropsWithoutRef<"h3">) => (
    <h3 className={cn("mt-6 mb-2 text-lg font-semibold tracking-tight", className)} {...props} />
  ),
  h4: ({ className, ...props }: ComponentPropsWithoutRef<"h4">) => (
    <h4 className={cn("mt-6 mb-2 text-base font-semibold tracking-tight", className)} {...props} />
  ),
  ul: ({ className, ...props }: ComponentPropsWithoutRef<"ul">) => (
    <ul className={cn("my-4 list-disc space-y-2 pl-6", className)} {...props} />
  ),
  ol: ({ className, ...props }: ComponentPropsWithoutRef<"ol">) => (
    <ol className={cn("my-4 list-decimal space-y-2 pl-6", className)} {...props} />
  ),
  li: ({ className, ...props }: ComponentPropsWithoutRef<"li">) => (
    <li className={cn("pl-1 leading-7", className)} {...props} />
  ),
  blockquote: ({ className, ...props }: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className={cn(
        "my-5 pl-4 italic text-muted-foreground/75",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }: ComponentPropsWithoutRef<"hr">) => (
    <hr className={cn("my-6 h-px border-0 bg-current opacity-10", className)} {...props} />
  ),
  table: ({ className, ...props }: ComponentPropsWithoutRef<"table">) => (
    <table
      className={cn(
        "my-5 w-full border-collapse text-left text-sm",
        className,
      )}
      {...props}
    />
  ),
  thead: ({ className, ...props }: ComponentPropsWithoutRef<"thead">) => (
    <thead className={cn("text-xs uppercase tracking-wide text-muted-foreground/70", className)} {...props} />
  ),
  tbody: ({ className, ...props }: ComponentPropsWithoutRef<"tbody">) => (
    <tbody className={cn("[&_tr+tr]:opacity-80", className)} {...props} />
  ),
  tr: ({ className, ...props }: ComponentPropsWithoutRef<"tr">) => (
    <tr className={cn("", className)} {...props} />
  ),
  th: ({ className, ...props }: ComponentPropsWithoutRef<"th">) => (
    <th className={cn("px-0 py-2 pr-5 font-medium", className)} {...props} />
  ),
  td: ({ className, ...props }: ComponentPropsWithoutRef<"td">) => (
    <td className={cn("px-0 py-2 pr-5 align-top opacity-80", className)} {...props } />
  ),
  pre: ({ className, children, ...props }: ComponentPropsWithoutRef<"pre">) => (
    (() => {
      const child = Children.toArray(children)[0];

      if (isValidElement<{ className?: string; children?: unknown }>(child)) {
        return (
          <div className={cn("my-5", className)} {...props as React.ComponentPropsWithoutRef<"div">}>
            <CodeMarkdown
              language={getCodeLanguage(child.props.className)}
              theme="anysphere"
              showCopyButton
              showLineNumbers
              showLanguage
            >
              {getTextContent(child.props.children).replace(/\n$/, "")}
            </CodeMarkdown>
          </div>
        );
      }

      return (
        <pre
          className={cn(
            "my-5 overflow-x-auto px-0 py-2 text-[13px] leading-6 text-inherit opacity-80",
            className,
          )}
          {...props}
        >
          {children}
        </pre>
      );
    })()
  ),
  code: ({
    inline,
    className,
    children,
    ...props
  }: ComponentPropsWithoutRef<"code"> & { inline?: boolean }) => {
    if (inline) {
      return (
        <code
          className={cn(
            "px-1 py-0.5 font-mono text-[0.85em] text-inherit opacity-80",
            className,
          )}
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <code className={cn("block min-w-full whitespace-pre font-mono text-inherit", className)} {...props}>
        {children}
      </code>
    );
  },
};

type MarkdownContentProps = {
  children: string;
  className?: string;
};

export const MarkdownContent = ({ children, className }: MarkdownContentProps) => {
  return (
    // React Markdown doesn't accept class name anymore
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
};
