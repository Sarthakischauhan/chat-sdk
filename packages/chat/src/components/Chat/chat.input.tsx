"use client";

import { useEffect, useRef } from "react";
import { useComposer } from "./context";

export const ChatInput = ({ placeholder = "Message..." }: { placeholder?: string }) => {
  const { input, setInput, disabled, submitInput } = useComposer();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const shell = el.closest<HTMLElement>(".chat-composer-shell");
    const isSmall = shell?.dataset.variant === "small";
    const max = isSmall ? 128 : 320;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [input]);

  return (
    <div className="chat-composer-input">
      <textarea
        ref={ref}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder={placeholder}
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
