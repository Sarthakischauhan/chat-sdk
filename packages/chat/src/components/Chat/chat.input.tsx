"use client";

import { useChat } from "./chat.context";

export const ChatInput = () => {
  const { state, dispatch, submitInput } = useChat();
  const { input, disabled } = state;

  return (
    <div className="chat-composer-input">
      <textarea
        value={input}
        onChange={(event) =>
          dispatch({ type: "setInput", data: { input: event.target.value } })
        }
        placeholder="Message..."
        disabled={disabled}
        rows={1}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) return;
          if (event.nativeEvent.isComposing) return;
          event.preventDefault();
          if (!disabled && input.trim()) {
            void submitInput();
          }
        }}
      />
    </div>
  );
};
