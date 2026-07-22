"use client";

import type { CSSProperties } from "react";
import type { ChatAdapter } from "../types";
import { ChatComposer } from "./Chat/chat";
import { ChatContextProvider } from "./Chat/chat.context";
import { Message } from "./Message/message";

type ChatProps = {
  adapter: ChatAdapter;
  className?: string;
  defaultThreadId?: string;
  registryUrl?: string;
  style?: CSSProperties;
};

export function Chat({ adapter, className, defaultThreadId, registryUrl, style }: ChatProps) {
  return (
    <ChatContextProvider adapter={adapter} defaultThreadId={defaultThreadId} registryUrl={registryUrl}>
      <div className={["chat-root", className].filter(Boolean).join(" ")} style={style}>
        <div className="chat-messages">
          <Message />
        </div>
        <div className="chat-composer">
          <ChatComposer />
        </div>
      </div>
    </ChatContextProvider>
  );
}
