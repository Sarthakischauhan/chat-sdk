"use client";

import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import type { ChatMessage } from "../../types";
import { getUserDisplayText } from "../../lib/message/user";
import { useChat } from "../Chat/chat.context";
import { MessageContent } from "../Message/message.content";

const getMessageTargetId = (messageId: string) => `chat-message-${messageId}`;

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
      <div id={getMessageTargetId(message.id)} className="chat-message chat-message-user">
        <div className="chat-message-user-inner">
          <div className="chat-message-bubble">
            {isEditing ? (
              <textarea
                className="chat-edit-area"
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
            <div className="chat-message-actions">
              <button
                type="button"
                className="chat-icon-button"
                style={{ opacity: 1 }}
                onClick={cancelEdit}
                disabled={isSubmittingEdit}
                aria-label="Cancel edit"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                className="chat-icon-button"
                style={{ opacity: 1, color: "var(--chat-fg)" }}
                onClick={submitEdit}
                disabled={!draft.trim() || isSubmittingEdit || isSending}
                aria-label="Send edited message"
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="chat-icon-button"
              onClick={() => {
                setDraft(getUserDisplayText(message));
                setIsEditing(true);
              }}
              disabled={isSending}
              aria-label="Edit and resend message"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-message chat-message-assistant">
      <div className="chat-message-assistant-inner">
        <MessageContent parts={message.parts} isUser={false} />
      </div>
    </div>
  );
};
