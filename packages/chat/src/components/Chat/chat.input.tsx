"use client";

import { useEffect, useRef } from "react";
import { clearErrorShake, motion, triggerErrorShake } from "../../motion";
import { useComposer } from "./context";

export const ChatInput = ({
  placeholder = "Message...",
  expanded = true,
}: {
  placeholder?: string;
  expanded?: boolean;
}) => {
  const { input, setInput, disabled, submitInput, attachments } = useComposer();
  const ref = useRef<HTMLTextAreaElement>(null);
  const hasDraft = input.trim().length > 0 || attachments.length > 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!expanded) {
      el.style.height = "";
      el.style.overflowY = "hidden";
      return;
    }
    el.style.height = "auto";
    const shell = el.closest<HTMLElement>(".chat-composer-shell");
    const isSmall = shell?.dataset.variant === "small";
    const max = isSmall ? 128 : 320;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [expanded, input]);

  return (
    <div className="chat-composer-input">
      <textarea
        ref={ref}
        value={input}
        onChange={(event) => {
          const wrap = event.currentTarget.closest<HTMLElement>(`.${motion.inputWrap}`);
          if (wrap) {
            clearErrorShake(wrap);
          }
          setInput(event.target.value);
        }}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) return;
          if (event.nativeEvent.isComposing) return;
          event.preventDefault();
          if (disabled) {
            return;
          }
          if (!hasDraft) {
            const wrap = event.currentTarget.closest<HTMLElement>(`.${motion.inputWrap}`);
            if (wrap) {
              triggerErrorShake(wrap);
            }
            return;
          }
          void submitInput();
        }}
      />
    </div>
  );
};
