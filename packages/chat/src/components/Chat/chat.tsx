"use client";
import { ChatInput } from "./chat.input";
import { ChatReferences } from "./chat.references";
import { ChatSend } from "./chat.send";
import { ChatSelect } from "./chat.select";

export const ChatComposer = () => {
  return (
    <div className="chat-composer-shell flex w-full flex-col gap-3 rounded-md px-1 py-6 shadow-sm">
      <ChatReferences />
      <ChatInput />
      <div className="mt-auto flex justify-between px-4">
        <ChatSelect />
        <ChatSend />
      </div>
    </div>
  );
};
