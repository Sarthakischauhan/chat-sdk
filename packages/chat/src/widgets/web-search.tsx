"use client";
import { useState } from "react";
import { Globe } from "lucide-react";
import { safeResultUrl } from "./compute";
import { ToolFrame } from "./tool-frame";
import type { WebSearchWidgetProps } from "./types";

function SiteIcon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  return <span className="chat-web-search-icon" aria-hidden="true">
    {failed ? <Globe size={14} /> : <img src={new URL("/favicon.ico", url).href} alt="" width={14} height={14}
      loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
  </span>;
}

/** Web sources use the same disclosure, status, and theme as other tool rows. */
export function WebSearchWidget({ query, results = [], total, maxResults = 5, defaultOpen, ...props }: WebSearchWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const limit = Number.isFinite(maxResults) ? Math.max(1, Math.floor(maxResults)) : 5;
  const sources = results.flatMap(result => {
    const href = safeResultUrl(result.url);
    return href ? [{ ...result, href, domain: new URL(href).hostname.replace(/^www\./, "") }] : [];
  });
  const count = Math.max(sources.length, Number.isFinite(total) ? Math.max(0, Math.floor(total!)) : 0);
  return <ToolFrame {...props} icon={Globe} label="Searched the web for" activeLabel="Searching the web for"
    title={query} meta={`${count} ${count === 1 ? "source" : "sources"}`} defaultOpen={defaultOpen}>
    {sources.length ? <ol className="chat-web-search-results" aria-label="Web search sources">
      {(expanded ? sources : sources.slice(0, limit)).map((source, index) => <li key={`${source.href}-${index}`}>
        <a className="chat-web-search-source" href={source.href} target="_blank" rel="noopener noreferrer">
          <SiteIcon key={source.href} url={source.href} />
          <span className="chat-web-search-title" title={source.title || source.domain}>{source.title || source.domain}</span>
          <span className="chat-sr-only">Opens in a new tab</span>
        </a>
      </li>)}
    </ol> : <p className="chat-widget-empty">{props.state === "running" ? "Searching the web…" : "No web sources found."}</p>}
    {sources.length > limit ? <button className="chat-widget-more" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
      {expanded ? "Show fewer sources" : `Show ${sources.length - limit} more ${sources.length - limit === 1 ? "source" : "sources"}`}
    </button> : null}
  </ToolFrame>;
}
