"use client";

import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { motion, triggerErrorShake } from "../../motion";
import { ChatInput } from "./chat.input";
import { ChatReferences } from "./chat.references";
import { ChatSend } from "./chat.send";
import { ChatSelect } from "./chat.select";
import { useMessages } from "./context";

export const ChatComposer = ({ showModelSelector = true }: { showModelSelector?: boolean }) => {
  const { status } = useMessages();
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "error" || !shellRef.current) {
      return;
    }

    triggerErrorShake(shellRef.current);
  }, [status]);

  return (
    <div
      ref={shellRef}
      className={cn("chat-composer-shell", motion.inputWrap, motion.input)}
    >
      <ChatReferences />
      <ChatInput />
      <div className="chat-composer-row">
        {showModelSelector ? <ChatSelect /> : null}
        <ChatSend />
      </div>
    </div>
  );
};
