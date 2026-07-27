"use client";

import { X } from "lucide-react";
import { useComposer } from "./context";

export const ChatReferences = () => {
  const { references, removeReference } = useComposer();

  if (references.length === 0) {
    return null;
  }

  return (
    <div className="chat-references">
      {references.map((reference, index) => (
        <div key={reference.id} className="chat-reference" title={reference.text}>
          <span className="chat-reference-text">{reference.text}</span>
          <button
            type="button"
            className="chat-icon-button"
            aria-label={`Remove reference ${index + 1}`}
            onClick={() => removeReference(reference.id)}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
