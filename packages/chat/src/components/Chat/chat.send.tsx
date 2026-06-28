import { useChat } from "./chat.context";
import { Send, Square } from "lucide-react";
import { Button } from "../../ui/button";

export const ChatSend = () => {
  const { state, status, submitInput, stopResponse } = useChat();
  const { sendDisabled } = state;
  const isSending = status === "submitted" || status === "streaming";

  return (
    <Button
      className="relative inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-xs transition-[transform,box-shadow,background-color] hover:shadow-sm active:scale-95 disabled:cursor-not-allowed"
      type="button"
      onClick={isSending ? stopResponse : submitInput}
      disabled={isSending ? false : sendDisabled}
      aria-label={isSending ? "Stop response" : "Send message"}
    >
      {isSending ? <Square size={16} fill="currentColor" /> : <Send size={18} />}
    </Button>
  );
};
