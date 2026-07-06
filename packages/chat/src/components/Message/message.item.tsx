"use client";

import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import type { ChatMessage } from "../../types";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { getUserDisplayText } from "../../lib/message/user";
import { useChat } from "../Chat/chat.context";
import { MessageContent } from "../Message/message.content";

const getMessageTargetId = (messageId: string) => `chatkit-message-${messageId}`;

export const MessageItem = ({ message }: { message: ChatMessage }) => {
  const { editAndResendMessage, status } = useChat();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => getUserDisplayText(message));
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const isUser = message.role === "user";
  const isSending = status === "submitted" || status === "streaming";

  const cancelEdit = () => {
    setDraft(getUserDisplayText(message));
    setIsEditing(false);
  };

  const submitEdit = async () => {
    if (!draft.trim() || isSending || isSubmittingEdit) {
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await editAndResendMessage(message.id, draft);
      setIsEditing(false);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  if (isUser) {
    return (
      <div
        id={getMessageTargetId(message.id)}
        className="flex w-full justify-end rounded-2xl"
      >
        <div className="group flex max-w-[85%] flex-col items-end gap-1.5 sm:max-w-[72%]">
          <div className="w-full rounded-3xl bg-muted/55 px-5 py-2.5 text-foreground shadow-xs shadow-black/[0.02] transition-colors dark:bg-muted/45">
            {isEditing ? (
              <Textarea
                className="min-h-28 resize-none rounded-2xl border border-border/25 bg-background/65 text-sm shadow-none focus-visible:border-border/45 focus-visible:ring-2 dark:bg-background/35"
                value={draft}
                disabled={isSubmittingEdit}
                autoFocus
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey) return;
                  if (event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  void submitEdit();
                }}
              />
            ) : (
              <MessageContent parts={message.parts} isUser />
            )}
          </div>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="cursor-pointer rounded-full text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
                onClick={cancelEdit}
                disabled={isSubmittingEdit}
                aria-label="Cancel edit"
              >
                <X />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                className="cursor-pointer rounded-full disabled:cursor-not-allowed"
                onClick={submitEdit}
                disabled={!draft.trim() || isSubmittingEdit || isSending}
                aria-label="Send edited message"
              >
                <Check />
              </Button>
            </div>
          ) : (
            <Button
              className="cursor-pointer rounded-full text-muted-foreground opacity-0 transition-[opacity,color,background-color] hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed"
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setDraft(getUserDisplayText(message));
                setIsEditing(true);
              }}
              disabled={isSending}
              aria-label="Edit and resend message"
            >
              <Pencil />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start gap-4 text-foreground">
      <div className="flex-1 overflow-hidden pt-1">
        <MessageContent parts={message.parts} isUser={false} />
      </div>
    </div>
  );
};
