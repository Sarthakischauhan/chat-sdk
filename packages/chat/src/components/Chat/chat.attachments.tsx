"use client";

import { FileText, Paperclip, X } from "lucide-react";
import { useRef } from "react";
import { useComposer } from "./context";

const isImageMediaType = (mediaType: string) => mediaType.startsWith("image/");

/** Whether a file matches an `<input accept>` list such as "image/*" or ".png,image/jpeg". */
export const acceptsFile = (file: File, accept?: string) => {
  if (!accept) {
    return true;
  }
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .some((token) =>
      token.startsWith(".")
        ? name.endsWith(token)
        : token.endsWith("/*")
          ? type.startsWith(token.slice(0, -1))
          : type === token,
    );
};

export const ChatAttachments = () => {
  const { attachments, removeAttachment } = useComposer();

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="chat-attachments">
      {attachments.map((attachment) => {
        const image = isImageMediaType(attachment.mediaType);

        return (
          <div
            key={attachment.id}
            className={image ? "chat-attachment chat-attachment-image" : "chat-attachment chat-attachment-file"}
          >
            {image ? (
              <img src={attachment.url} alt={attachment.filename} />
            ) : (
              <>
                <FileText size={14} aria-hidden="true" />
                <span className="chat-attachment-name">{attachment.filename}</span>
              </>
            )}
            <button
              type="button"
              className="chat-attachment-remove"
              aria-label={`Remove ${attachment.filename}`}
              onClick={() => removeAttachment(attachment.id)}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const ChatAttachButton = ({ accept }: { accept?: string } = {}) => {
  const { disabled, addFiles } = useComposer();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        className="chat-attach"
        aria-label="Add attachment"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip size={16} />
      </button>
      <input
        ref={inputRef}
        className="chat-attach-input"
        type="file"
        accept={accept}
        multiple
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const files = event.currentTarget.files;
          if (files && files.length > 0) {
            void addFiles(Array.from(files).filter((file) => acceptsFile(file, accept)));
          }
          event.currentTarget.value = "";
        }}
      />
    </>
  );
};
