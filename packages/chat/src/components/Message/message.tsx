"use client";

import { useChat } from "../Chat/chat.context";
import { MessageItem } from "../Message/message.item";

export const Message = () => {
  const { messages, isLoadingThread } = useChat();

  if (isLoadingThread) {
    return <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm text-zinc-500">Loading chat...</div>;
  }

  return (
    <div className="message-container flex-1 p-4 space-y-6">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
};
