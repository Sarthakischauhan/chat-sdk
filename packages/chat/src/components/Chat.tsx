"use client";

import type { CSSProperties } from "react";
import { useCallback, useMemo } from "react";
import type { ChatAdapter } from "../types";
import { ThemeProvider, useTheme, type ChatTheme } from "../theme/theme.context";
import { ThemeToggle } from "../theme/theme.toggle";
import { ChatComposer } from "./Chat/chat";
import { ChatContextProvider, useChat } from "./Chat/chat.context";
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
  registryUrl?: string;
  style?: CSSProperties;
  /** Widget map or defineWidget(...) array. */
  widgets?: ChatWidgetInput;
  /** Controlled theme. Omit to manage theme internally. */
  theme?: ChatTheme;
  defaultTheme?: ChatTheme;
  onThemeChange?: (theme: ChatTheme) => void;
  showThemeToggle?: boolean;
};

function ChatShell({
  className,
  style,
  widgets,
  showThemeToggle = true,
}: {
  className?: string;
  style?: CSSProperties;
  widgets?: ChatWidgetInput;
  showThemeToggle?: boolean;
}) {
  const { sendMessage, status } = useChat();
  const { resolvedTheme } = useTheme();
  const registry = useMemo(() => createWidgetRegistry(widgets), [widgets]);

  const respondToWidget = useCallback(
    async (response: WidgetResponse) => {
      const text =
        response.actionId ??
        response.label ??
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
      disabled={status === "submitted" || status === "streaming"}
    >
      <div
        className={["chat-root", className].filter(Boolean).join(" ")}
        style={style}
        data-theme={resolvedTheme}
      >
        {showThemeToggle && (
          <div className="chat-toolbar">
            <ThemeToggle />
          </div>
        )}
        <div className="chat-messages">
          <Message />
        </div>
        <div className="chat-composer">
          <ChatComposer />
        </div>
      </div>
    </WidgetProvider>
  );
}

export function Chat({
  adapter,
  className,
  defaultThreadId,
  registryUrl,
  style,
  widgets,
  theme,
  defaultTheme = "system",
  onThemeChange,
  showThemeToggle = true,
}: ChatProps) {
  return (
    <ThemeProvider
      theme={theme}
      defaultTheme={defaultTheme}
      onThemeChange={onThemeChange}
    >
      <ChatContextProvider adapter={adapter} defaultThreadId={defaultThreadId} registryUrl={registryUrl}>
        <ChatShell
          className={className}
          style={style}
          widgets={widgets}
          showThemeToggle={showThemeToggle}
        />
      </ChatContextProvider>
    </ThemeProvider>
  );
}
