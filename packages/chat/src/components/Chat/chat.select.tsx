"use client";
import { ProviderId, useChat } from "./chat.context";
import {
  Select,
  SelectContent,
  SelectValue,
  SelectTrigger,
  SelectItem,
} from "../../ui/select";

export const ChatSelect = () => {
  const { state, dispatch, status } = useChat();
  const { provider } = state;
  const isSending = status === "submitted" || status === "streaming";

  return (
    <Select
      value={provider}
      onValueChange={(value) =>
        dispatch({
          type: "setProvider",
          data: { provider: value as ProviderId },
        })
      }
      disabled={isSending}
    >
      <SelectTrigger className="h-8 w-32 rounded-lg px-4 text-sm border-0">
        <SelectValue placeholder="Select provider" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="openai">OpenAI</SelectItem>
        <SelectItem value="anthropic">Anthropic</SelectItem>
        <SelectItem value="google">Google</SelectItem>
        <SelectItem value="ollama">Ollama</SelectItem>
      </SelectContent>
    </Select>
  );
};
