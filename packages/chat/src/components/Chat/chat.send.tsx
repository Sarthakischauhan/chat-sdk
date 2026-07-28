"use client";

import { Send, Square } from "lucide-react";
import { useComposer, useMessages } from "./context";

export const ChatSend = () => {
  const { canSend, submitInput } = useComposer();
  const { status, stopResponse, isSending } = useMessages();

  return (
    <button
      className="chat-send"
      type="button"
      data-state={isSending ? "stop" : "send"}
      onClick={isSending ? stopResponse : submitInput}
      disabled={isSending ? false : !canSend}
      aria-label={isSending ? "Stop response" : "Send message"}
    >
      {isSending ? <Square size={14} fill="currentColor" /> : <Send size={16} />}
    </button>
  );
};
