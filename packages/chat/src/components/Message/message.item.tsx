"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import type { ChatMessage } from "../../types";
import { getUserDisplayText } from "../../lib/message/user";
import { useMessages } from "../Chat/context";
import { MessageContent } from "../Message/message.content";

const getMessageTargetId = (messageId: string) => `chat-message-${messageId}`;

export const MessageItem = ({ message }: { message: ChatMessage }) => {
  const { editAndResendMessage, isSending } = useMessages();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => getUserDisplayText(message));
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const isUser = message.role === "user";

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
        <div className={`chat-message-user-inner${isEditing ? " is-editing" : ""}`}>
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
                className="chat-text-button"
                onClick={cancelEdit}
                disabled={isSubmittingEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="chat-text-button chat-text-button-done"
                onClick={submitEdit}
                disabled={!draft.trim() || isSubmittingEdit || isSending}
              >
                Done
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
