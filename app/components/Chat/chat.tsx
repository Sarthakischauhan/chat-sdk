"use client";
import { ChatInput } from "./chat.input";
import { ChatReferences } from "./chat.references";
import { ChatSend } from "./chat.send";
import { ChatSelect } from "./chat.select";

export const Chat = () => {
  return (
    <div className="w-full px-1 py-6 flex flex-col gap-3 shadow-sm rounded-md">
      <ChatReferences />
      <ChatInput />
      <div className="mt-auto flex justify-between px-4">
        <ChatSelect />
        <ChatSend />
      </div>
    </div>
  );
};
