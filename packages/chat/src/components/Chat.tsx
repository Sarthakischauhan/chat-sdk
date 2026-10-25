"use client";

import { PenSquare } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import type { ChatAdapter } from "../types";
import { ThemeProvider, useTheme, type ChatTheme } from "../theme/theme.context";
import { ThemeToggle } from "../theme/theme.toggle";
import { ChatComposer, type ComposerCollapsedVariant } from "./Chat/chat";
import type { ComposerOrbState } from "./Chat/chat.orb-reasoning";
import { ChatContextProvider, useMessages } from "./Chat/chat.context";
import { useThread } from "./Chat/context";
import { useStickToBottom } from "../lib/use-stick-to-bottom";
import { Message } from "./Message/message";
import {
  createWidgetRegistry,
  WidgetProvider,
  type ChatWidgetInput,
  type WidgetResponse,
} from "./Widget/widget.context";

type ChatProps = {
  adapter: ChatAdapter;
  className?: string;
  defaultThreadId?: string;
  defaultProvider?: string;
  registryUrl?: string;
  style?: CSSProperties;
  /** Widget map or defineWidget(...) array. */
  widgets?: ChatWidgetInput;
  /** Controlled theme. Omit to manage theme internally. */
  theme?: ChatTheme;
  defaultTheme?: ChatTheme;
  onThemeChange?: (theme: ChatTheme) => void;
  showThemeToggle?: boolean;
  showModelSelector?: boolean;
  collapsedVariant?: ComposerCollapsedVariant;
  defaultExpanded?: boolean;
  placeholder?: string;
  inputLabel?: string;
  showAttachments?: boolean;
  /** File types the composer attaches, e.g. "image/*". Default: any file. */
  attachmentAccept?: string;
  /** Orb activity for the circle composer; `"thinking"` enables the reasoning popover. */
  state?: ComposerOrbState;
  /** Live reasoning text shown above the thinking orb. */
  reasoning?: string;
};

type ComposerOptions = Pick<ChatProps, "placeholder" | "inputLabel" | "showAttachments" | "attachmentAccept" | "state" | "reasoning">;

function ChatShell({
  className,
  style,
  widgets,
  showThemeToggle = true,
  showModelSelector = true,
  collapsedVariant = "pill",
  defaultExpanded = false,
  composer,
}: {
  composer?: ComposerOptions;
  className?: string;
  style?: CSSProperties;
  widgets?: ChatWidgetInput;
  showThemeToggle?: boolean;
  showModelSelector?: boolean;
  collapsedVariant?: ComposerCollapsedVariant;
  defaultExpanded?: boolean;
}) {
  const { sendMessage, isSending, status, messages } = useMessages();
  const { createThread, activeThreadId } = useThread();
  const { resolvedTheme } = useTheme();
  const registry = useMemo(() => createWidgetRegistry(widgets), [widgets]);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Switching threads or the first history load (empty -> non-empty) re-sticks to the bottom.
  const hasMessages = messages.length > 0;
  const { scrollToBottom } = useStickToBottom(messagesRef, {
    resetKey: `${activeThreadId ?? ""}:${hasMessages ? "loaded" : "empty"}`,
  });

  // Sending a message always jumps to the latest turn; streaming follows only while near the bottom.
  useLayoutEffect(() => {
    if (status === "submitted") scrollToBottom();
  }, [status, scrollToBottom]);

  const respondToWidget = useCallback(
    async (response: WidgetResponse) => {
      const text =
        response.label ??
        response.actionId ??
        (typeof response.value === "string" ? response.value : JSON.stringify(response.value));

      if (!text.trim()) {
        return;
      }

      await sendMessage({ text });
    },
    [sendMessage],
  );

  return (
    <WidgetProvider
      widgets={registry}
      respondToWidget={respondToWidget}
      disabled={isSending}
    >
      <div
        className={["chat-root", className].filter(Boolean).join(" ")}
        style={style}
        data-theme={resolvedTheme}
      >
        <div className="chat-toolbar">
          <button
            type="button"
            className="chat-theme-toggle"
            onClick={() => void createThread()}
            aria-label="Start a new chat"
            title="New chat"
            disabled={isSending}
          >
            <PenSquare size={16} strokeWidth={1.75} />
          </button>
          {showThemeToggle && (
            <ThemeToggle />
          )}
        </div>
        <div className="chat-messages" ref={messagesRef}>
          <Message />
        </div>
        <div className="chat-composer">
          <ChatComposer
            showModelSelector={showModelSelector}
            collapsedVariant={collapsedVariant}
            defaultExpanded={defaultExpanded}
            {...composer}
          />
        </div>
      </div>
    </WidgetProvider>
  );
}

export function Chat({
  adapter,
  className,
  defaultThreadId,
  defaultProvider,
  registryUrl,
  style,
  widgets,
  theme,
  defaultTheme = "system",
  onThemeChange,
  showThemeToggle = true,
  showModelSelector = true,
  collapsedVariant = "pill",
  defaultExpanded = false,
  placeholder,
  inputLabel,
  showAttachments,
  attachmentAccept,
  state,
  reasoning,
}: ChatProps) {
  return (
    <ThemeProvider
      theme={theme}
      defaultTheme={defaultTheme}
      onThemeChange={onThemeChange}
    >
      <ChatContextProvider
        adapter={adapter}
        defaultThreadId={defaultThreadId}
        defaultProvider={defaultProvider}
        registryUrl={registryUrl}
      >
        <ChatShell
          className={className}
          style={style}
          widgets={widgets}
          showThemeToggle={showThemeToggle}
          showModelSelector={showModelSelector}
          collapsedVariant={collapsedVariant}
          defaultExpanded={defaultExpanded}
          composer={{ placeholder, inputLabel, showAttachments, attachmentAccept, state, reasoning }}
        />
      </ChatContextProvider>
    </ThemeProvider>
  );
}
