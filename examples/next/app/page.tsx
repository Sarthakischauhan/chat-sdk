"use client";

import { Chat } from "@sarchauhan/chat";
import { createAiSdkAdapter } from "@sarchauhan/ai-sdk";
import { exampleWidgets } from "@/components/chat-widgets";

export default function Page() {
  return (
    <main className="chat-app-shell">
      <Chat
        adapter={createAiSdkAdapter()}
        widgets={exampleWidgets}
        defaultTheme="system"
        className="chat-app-frame"
      />
    </main>
  );
}
