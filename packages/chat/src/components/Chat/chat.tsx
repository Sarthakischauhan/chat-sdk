"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { motion, triggerErrorShake } from "../../motion";
import { acceptsFile, ChatAttachButton, ChatAttachments } from "./chat.attachments";
import { ChatInput } from "./chat.input";
import { ChatReferences } from "./chat.references";
import { ChatSend } from "./chat.send";
import { ChatSelect } from "./chat.select";
import { OrbReasoning, type ComposerOrbState, type ComposerReasoning } from "./chat.orb-reasoning";
import { useComposer, useMessages } from "./context";

const focusStaysInComposer = (shell: HTMLElement, node: Node | null) => {
  if (node && shell.contains(node)) {
    return true;
  }

  return node instanceof Element && node.closest("[data-slot='select-content']") !== null;
};

const noReasoning: ComposerReasoning = [];

export type ComposerCollapsedVariant = "pill" | "circle";

export const ChatComposer = ({
  showModelSelector = true,
  collapsedVariant = "pill",
  defaultExpanded = false,
  placeholder,
  inputLabel,
  showAttachments = true,
  attachmentAccept,
  state = "idle",
  reasoning = noReasoning,
}: {
  showModelSelector?: boolean;
  /** Placeholder for the message input. */
  placeholder?: string;
  /** Accessible name for the message input. Defaults to the placeholder. */
  inputLabel?: string;
  /** Hide the attach button and attachment list for text-only backends. */
  showAttachments?: boolean;
  /**
   * File types the attach button, paste and drop accept (an `<input accept>` list,
   * e.g. "image/*"). Default: any file.
   */
  attachmentAccept?: string;
  /** Resting shape when the composer is empty and blurred. Default is the wide pill. */
  collapsedVariant?: ComposerCollapsedVariant;
  /** Open on the large composer. Used so a story can show the model picker without a click. */
  defaultExpanded?: boolean;
  /**
   * Orb activity. With `collapsedVariant="circle"`, `"thinking"` shows the live
   * `reasoning` popover above the orb on hover or keyboard focus.
   */
  state?: ComposerOrbState;
  /** Live reasoning stream. Append `{ id, text }` chunks as tokens arrive. */
  reasoning?: ComposerReasoning;
}) => {
  const { status } = useMessages();
  const { input, attachments, references, addFiles, disabled } = useComposer();
  const shellRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(defaultExpanded);
  const expanded =
    focused || input.trim().length > 0 || attachments.length > 0 || references.length > 0;

  // Pasted and dropped files go into the same attachment preview as the attach button.
  const takeFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((file) => acceptsFile(file, attachmentAccept));
    if (!showAttachments || disabled || files.length === 0) {
      return false;
    }
    void addFiles(files);
    return true;
  };
  const carriesFiles = (types: readonly string[]) => showAttachments && types.includes("Files");

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

  const shell = (
    <div
      ref={shellRef}
      className={cn("chat-composer-shell", motion.inputWrap, motion.input)}
      data-expanded={expanded ? "true" : "false"}
      data-collapsed={collapsedVariant}
      data-orb-state={collapsedVariant === "circle" ? state : undefined}
      onPaste={(event) => {
        if (takeFiles(event.clipboardData.files)) {
          event.preventDefault();
        }
      }}
      onDragOver={(event) => {
        if (carriesFiles(event.dataTransfer.types)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }
      }}
      onDrop={(event) => {
        if (carriesFiles(event.dataTransfer.types)) {
          event.preventDefault();
          takeFiles(event.dataTransfer.files);
        }
      }}
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
      {showAttachments ? <ChatAttachments /> : null}
      <ChatReferences />
      <ChatInput expanded={expanded} placeholder={placeholder} label={inputLabel} />
      <div className="chat-composer-row">
        <div className="chat-composer-tools">
          {showAttachments ? <ChatAttachButton accept={attachmentAccept} /> : null}
          {showModelSelector && expanded && collapsedVariant === "circle" ? <ChatSelect /> : null}
        </div>
        <ChatSend />
      </div>
    </div>
  );

  return collapsedVariant === "circle" ? (
    <OrbReasoning state={state} reasoning={reasoning}>
      {shell}
    </OrbReasoning>
  ) : (
    shell
  );
};
