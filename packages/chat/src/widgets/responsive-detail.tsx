"use client";
import { useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";

export type ResponsiveDetailProps = {
  title: string;
  description?: string;
  trigger: ReactElement;
  children: ReactNode;
};
/** One accessible dialog; CSS changes its presentation to a bottom sheet below 640px. */
export function ResponsiveDetail({ title, description = "Details from this conversation", trigger, children }: ResponsiveDetailProps) {
  const origin = useRef<HTMLDivElement>(null);
  const [presentation, setPresentation] = useState<{ theme: string; style: CSSProperties }>({ theme: "light", style: {} });
  return <div ref={origin} className="chat-detail-origin">
    <Dialog.Root onOpenChange={(open) => {
      if (!open || !origin.current) return;
      const host = origin.current.closest(".chat-root") ?? origin.current;
      const computed = window.getComputedStyle(host);
      const tokens: Record<string, string> = {};
      for (let index = 0; index < computed.length; index++) {
        const name = computed.item(index);
        if (name.startsWith("--chat-")) tokens[name] = computed.getPropertyValue(name);
      }
      const requested = host.getAttribute("data-theme");
      const dark = requested === "dark" || (requested === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
      setPresentation({ theme: dark ? "dark" : "light", style: tokens as CSSProperties });
    }}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="chat-detail-overlay" />
        <Dialog.Content className="chat-root chat-detail-panel" data-theme={presentation.theme} style={presentation.style}>
          <div className="chat-detail-handle" aria-hidden="true" />
          <header className="chat-detail-header">
            <div><Dialog.Title className="chat-detail-title">{title}</Dialog.Title>
              <Dialog.Description className="chat-detail-description">{description}</Dialog.Description></div>
            <Dialog.Close className="chat-detail-close" aria-label="Close details"><X size={18} aria-hidden="true" /></Dialog.Close>
          </header>
          <div className="chat-detail-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}
