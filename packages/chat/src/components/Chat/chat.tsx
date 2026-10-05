"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { motion, triggerErrorShake } from "../../motion";
import { ChatAttachButton, ChatAttachments } from "./chat.attachments";
import { ChatInput } from "./chat.input";
import { ChatReferences } from "./chat.references";
import { ChatSend } from "./chat.send";
import { ChatSelect } from "./chat.select";
import { useComposer, useMessages } from "./context";

const focusStaysInComposer = (shell: HTMLElement, node: Node | null) => {
  if (node && shell.contains(node)) {
    return true;
  }

  return node instanceof Element && node.closest("[data-slot='select-content']") !== null;
};

export type ComposerCollapsedVariant = "pill" | "circle";

export const ChatComposer = ({
  showModelSelector = true,
  collapsedVariant = "pill",
  defaultExpanded = false,
}: {
  showModelSelector?: boolean;
  /** Resting shape when the composer is empty and blurred. Default is the wide pill. */
  collapsedVariant?: ComposerCollapsedVariant;
  /** Open on the large composer. Used so a story can show the model picker without a click. */
  defaultExpanded?: boolean;
}) => {
  const { status } = useMessages();
  const { input, attachments, references } = useComposer();
  const shellRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(defaultExpanded);
  const expanded =
    focused || input.trim().length > 0 || attachments.length > 0 || references.length > 0;

  useEffect(() => {
    if (status !== "error" || !shellRef.current) {
      return;
    }

    triggerErrorShake(shellRef.current);
  }, [status]);

  useEffect(() => {
    if (!focused) {
      return;
    }

    const onFocusIn = () => {
      const shell = shellRef.current;
      if (!shell) {
        return;
      }
      if (focusStaysInComposer(shell, document.activeElement)) {
        return;
      }
      setFocused(false);
    };

    document.addEventListener("focusin", onFocusIn, true);
    return () => document.removeEventListener("focusin", onFocusIn, true);
  }, [focused]);

  return (
    <div
      ref={shellRef}
      className={cn("chat-composer-shell", motion.inputWrap, motion.input)}
      data-expanded={expanded ? "true" : "false"}
      data-collapsed={collapsedVariant}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        const shell = event.currentTarget;
        const next = event.relatedTarget;
        if (next instanceof Node && focusStaysInComposer(shell, next)) {
          return;
        }

        window.setTimeout(() => {
          if (focusStaysInComposer(shell, document.activeElement)) {
            return;
          }
          setFocused(false);
        }, 0);
      }}
    >
      {expanded || collapsedVariant !== "circle" ? null : (
        <MessageCircle className="chat-composer-collapsed-icon" size={18} aria-hidden="true" />
      )}
      <ChatAttachments />
      <ChatReferences />
      <ChatInput expanded={expanded} />
      <div className="chat-composer-row">
        <div className="chat-composer-tools">
          <ChatAttachButton />
          {showModelSelector && expanded && collapsedVariant === "circle" ? <ChatSelect /> : null}
        </div>
        <ChatSend />
      </div>
    </div>
  );
};
