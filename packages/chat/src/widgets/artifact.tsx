"use client";
import { useState } from "react";
import { Download, FileText, Image as ImageIcon, ExternalLink } from "lucide-react";
import type { AgentArtifact } from "@sarchauhan/protocol";
import { ResponsiveDetail } from "./responsive-detail";

export type ArtifactWidgetProps = { artifact: AgentArtifact; className?: string };
export type ArtifactsWidgetProps = { artifacts: AgentArtifact[]; className?: string };
/** Same-origin relative URLs, HTTP(S), blob URLs, and raster-image data URLs only. */
export function safeArtifactUrl(value?: string, image = false): string | undefined {
  if (!value || /[\u0000-\u0020\u007f]/.test(value)) return undefined;
  if (/^blob:/i.test(value)) {
    try { new URL(value); return value; } catch { return undefined; }
  }
  if (image && /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  try {
    const parsed = new URL(value, "https://chat.invalid");
    if (!["https:", "http:"].includes(parsed.protocol)) return undefined;
    return value;
  } catch { return undefined; }
}
export function formatArtifactSize(bytes?: number): string | undefined {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return undefined;
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
export function ArtifactWidget({ artifact, className = "" }: ArtifactWidgetProps) {
  const { filename, mediaType, content, sizeBytes, error } = artifact;
  const state = artifact.status ?? "ready";
  const image = mediaType.startsWith("image/");
  const [failedUrl, setFailedUrl] = useState<string>();
  const previewUrl = image ? safeArtifactUrl(artifact.url, true) : undefined;
  const link = safeArtifactUrl(artifact.url, image);
  const ready = state === "ready";
  const preview = ready && ((previewUrl && failedUrl !== previewUrl) || content !== undefined);
  const Icon = image ? ImageIcon : FileText;
  const label = state === "creating" ? "Creating…" : state === "error" ? "Could not create file" : "Created";
  const metadata = [mediaType, formatArtifactSize(sizeBytes)].filter(Boolean).join(" · ");
  return <section className={"chat-prebuilt chat-artifact " + className} aria-label={"Artifact: " + filename} data-state={state}>
    {ready && previewUrl && failedUrl !== previewUrl ? <div className="chat-artifact-thumbnail">
      <img src={previewUrl} alt={filename} loading="lazy" onError={() => setFailedUrl(previewUrl)} />
    </div> : null}
    <div className="chat-artifact-row">
      <span className="chat-artifact-icon"><Icon size={20} aria-hidden="true" /></span>
      <div className="chat-artifact-heading"><strong title={filename}>{filename}</strong><span>{metadata}</span></div>
      <span className="chat-artifact-state" role="status">{label}</span>
    </div>
    {state === "error" && error ? <p className="chat-widget-error" role="alert">{error}</p> : null}
    {ready && image && previewUrl && failedUrl === previewUrl ? <p className="chat-widget-empty">Image preview unavailable.</p> : null}
    {ready && (preview || link) ? <footer className="chat-artifact-actions">
      {preview ? <ResponsiveDetail title={filename} description={metadata} trigger={<button type="button">Preview</button>}>
        {image && previewUrl && failedUrl !== previewUrl
          ? <img className="chat-artifact-full-image" src={previewUrl} alt={filename} onError={() => setFailedUrl(previewUrl)} />
          : <pre className="chat-artifact-text" tabIndex={0}>{content}</pre>}
      </ResponsiveDetail> : null}
      {link ? <>
        <a href={link} target="_blank" rel="noreferrer"><ExternalLink size={14} aria-hidden="true" />Open</a>
        <a href={link} download={filename} target="_blank" rel="noreferrer"><Download size={14} aria-hidden="true" />Download</a>
      </> : null}
    </footer> : null}
  </section>;
}
export function ArtifactsWidget({ artifacts, className = "" }: ArtifactsWidgetProps) {
  return <div className={"chat-artifacts " + className}>{artifacts.map((artifact) => <ArtifactWidget key={artifact.id} artifact={artifact} />)}</div>;
}
