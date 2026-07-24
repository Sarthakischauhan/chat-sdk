"use client";

import type { CSSProperties } from "react";
import { useCallback, useMemo } from "react";
import type { ChatAdapter } from "../types";
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
};

function ChatShell({
  className,
  style,
  widgets,
}: {
  className?: string;
  style?: CSSProperties;
  widgets?: ChatWidgetInput;
}) {
  const { sendMessage, status } = useChat();
  const registry = useMemo(() => createWidgetRegistry(widgets), [widgets]);

  const respondToWidget = useCallback(
    async (response: WidgetResponse) => {
      const text =
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
      <div className={["chat-root", className].filter(Boolean).join(" ")} style={style}>
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
}: ChatProps) {
  return (
    <ChatContextProvider adapter={adapter} defaultThreadId={defaultThreadId} registryUrl={registryUrl}>
      <ChatShell className={className} style={style} widgets={widgets} />
    </ChatContextProvider>
  );
}
