"use client";

import type { CSSProperties } from "react";
import type { ChatAdapter } from "../types";
import { Chat } from "./Chat/chat";
import { ChatContextProvider } from "./Chat/chat.context";
import { Message } from "./Message/message";

type ChatKitProps = {
  adapter: ChatAdapter;
  className?: string;
  defaultThreadId?: string;
  style?: CSSProperties;
};

export function ChatKit({ adapter, className, defaultThreadId, style }: ChatKitProps) {
  return (
    <ChatContextProvider adapter={adapter} defaultThreadId={defaultThreadId}>
      <div className={["chatkit-root", className].filter(Boolean).join(" ")} style={style}>
        <div className="chatkit-messages">
          <Message />
        </div>
        <div className="chatkit-composer">
          <Chat />
        </div>
      </div>
    </ChatContextProvider>
  );
}
