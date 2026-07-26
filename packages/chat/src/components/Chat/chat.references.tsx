"use client";

import { X } from "lucide-react";
import { useChat } from "./chat.context";

export const ChatReferences = () => {
  const { state, dispatch } = useChat();

  if (state.references.length === 0) {
    return null;
  }

  return (
    <div className="chat-references">
      {state.references.map((reference, index) => (
        <div key={reference.id} className="chat-reference">
          <div className="min-w-0 flex-1">
            <div className="chat-reference-label">Reference {index + 1}</div>
            <div className="chat-reference-text">{reference.text}</div>
          </div>
          <button
            type="button"
            className="chat-icon-button"
            style={{ opacity: 1 }}
            aria-label={`Remove reference ${index + 1}`}
            onClick={() =>
              dispatch({
                type: "removeReference",
                data: { id: reference.id },
              })
            }
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
