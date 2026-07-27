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
        <div key={reference.id} className="chat-reference" title={reference.text}>
          <span className="chat-reference-text">{reference.text}</span>
          <button
            type="button"
            className="chat-icon-button"
            aria-label={`Remove reference ${index + 1}`}
            onClick={() =>
              dispatch({
                type: "removeReference",
                data: { id: reference.id },
              })
            }
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
