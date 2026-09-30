"use client";
import { useState } from "react";
import { safeResultUrl } from "./compute";
import { ToolFrame } from "./tool-frame";
import type { SearchWidgetProps } from "./types";
export function SearchWidget({
  query,
  results = [],
  total,
  maxResults = 5,
  ...props
}: SearchWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const limit = Math.max(1, maxResults);
  const count = Math.max(results.length, total ?? 0);
  return (
    <ToolFrame
      {...props}
      label="Search"
      title={query}
      meta={`${count} ${count === 1 ? "result" : "results"}`}
    >
      {!results.length ? (
        <p className="chat-widget-empty">
          {props.state === "running" ? "Searching…" : "No results found."}
        </p>
      ) : (
        <ol className="chat-search-results">
          {(expanded ? results : results.slice(0, limit)).map(
            (result, index) => {
              const href = safeResultUrl(result.url);
              const label = (
                <>
                  {result.title || result.path}
                  {result.line ? (
                    <span className="chat-search-line">:{result.line}</span>
                  ) : null}
                </>
              );
              return (
                <li key={`${result.path}-${result.line}-${index}`}>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer">
                      {label}
                    </a>
                  ) : (
                    <div className="chat-search-path">{label}</div>
                  )}
                  {result.text ? <p>{result.text}</p> : null}
                </li>
              );
            },
          )}
        </ol>
      )}
      {!expanded && results.length > limit ? (
        <button
          className="chat-widget-more"
          type="button"
          onClick={() => setExpanded(true)}
        >
          Show {results.length - limit} more results
        </button>
      ) : null}
    </ToolFrame>
  );
}
