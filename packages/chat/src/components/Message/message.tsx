"use client";

import { useMessages, useThread } from "../Chat/context";
import { MessageItem } from "../Message/message.item";
import { TextSkeleton } from "./message.skeleton";

const WaitingForResponse = () => (
  <div className="chat-response-status" role="status" aria-live="polite">
    <TextSkeleton />
  </div>
);

export const Message = () => {
  const { messages, isWaitingForResponse } = useMessages();
  const { isLoadingThread } = useThread();

  if (isLoadingThread) {
    return (
      <div className="chat-messages-inner">
        <div className="chat-loading chat-loading-initial" role="status" aria-live="polite">
          Loading conversation…
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="chat-messages-inner">
        <div className="chat-empty">
          <div>
            <p className="chat-empty-title">How can I help?</p>
            <p className="chat-empty-copy">
              Ask a question, explore ideas, or use tools and widgets when the agent needs them.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-messages-inner">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      {isWaitingForResponse ? <WaitingForResponse /> : null}
    </div>
  );
};
