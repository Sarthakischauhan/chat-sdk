import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import type { PluggableList } from "unified";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { cn } from "../../lib/utils";

const markdownPlugins: { remark: PluggableList; rehype: PluggableList } = {
  remark: [remarkGfm],
  rehype: [[rehypeHighlight, { detect: true, ignoreMissing: true }]],
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
        "my-5 border-l-2 border-border/80 pl-4 italic text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }: ComponentPropsWithoutRef<"hr">) => (
    <hr className={cn("my-6 border-border/80", className)} {...props} />
  ),
  table: ({ className, ...props }: ComponentPropsWithoutRef<"table">) => (
    <table
      className={cn(
        "my-5 w-full border-collapse overflow-hidden rounded-xl border border-border/70 text-left text-sm",
        className,
      )}
      {...props}
    />
  ),
  thead: ({ className, ...props }: ComponentPropsWithoutRef<"thead">) => (
    <thead className={cn("bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground", className)} {...props} />
  ),
  tbody: ({ className, ...props }: ComponentPropsWithoutRef<"tbody">) => (
    <tbody className={cn("divide-y divide-border/70", className)} {...props} />
  ),
  tr: ({ className, ...props }: ComponentPropsWithoutRef<"tr">) => (
    <tr className={cn("border-b border-border/60", className)} {...props} />
  ),
  th: ({ className, ...props }: ComponentPropsWithoutRef<"th">) => (
    <th className={cn("border border-border/60 px-3 py-2 font-medium", className)} {...props} />
  ),
  td: ({ className, ...props }: ComponentPropsWithoutRef<"td">) => (
    <td className={cn("border border-border/60 px-3 py-2 align-top", className)} {...props} />
  ),
  pre: ({ className, children, ...props }: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className={cn(
        "my-5 overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-950 px-4 py-4 text-[13px] leading-6 text-zinc-100 shadow-sm shadow-black/10",
        className,
      )}
      {...props}
    >
      {children}
    </pre>
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
            "rounded-md border border-border/60 bg-muted/70 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground",
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
