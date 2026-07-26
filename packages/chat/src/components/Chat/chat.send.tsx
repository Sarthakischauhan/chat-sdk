"use client";

import { Send, Square } from "lucide-react";
import { useChat } from "./chat.context";

export const ChatSend = () => {
  const { state, status, submitInput, stopResponse } = useChat();
  const { sendDisabled } = state;
  const isSending = status === "submitted" || status === "streaming";

  return (
    <button
      className="chat-send"
      type="button"
      data-state={isSending ? "stop" : "send"}
      onClick={isSending ? stopResponse : submitInput}
      disabled={isSending ? false : sendDisabled}
      aria-label={isSending ? "Stop response" : "Send message"}
    >
      {isSending ? <Square size={14} fill="currentColor" /> : <Send size={16} />}
    </button>
  );
};
