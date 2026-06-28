"use client";

import type { CSSProperties } from "react";
import { Chat } from "./Chat/chat";
import { ChatContextProvider } from "./Chat/chat.context";
import { Message } from "./Message/message";

type ChatKitProps = {
  className?: string;
  style?: CSSProperties;
};

export function ChatKit({ className, style }: ChatKitProps) {
  return (
    <ChatContextProvider>
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

