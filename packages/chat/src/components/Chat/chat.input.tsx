"use client";

import { useComposer } from "./context";

export const ChatInput = () => {
  const { input, setInput, disabled, submitInput } = useComposer();

  return (
    <div className="chat-composer-input">
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
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
