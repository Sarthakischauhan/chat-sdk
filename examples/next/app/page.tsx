"use client";

import { Chat } from "@sarchauhan/chat";
import { createDefaultFetchAdapter } from "@/lib/adapters/fetch";
import { exampleWidgets } from "@/components/chat-widgets";

export default function Page() {
  return (
    <main className="chat-app-shell">
      <Chat
        adapter={createDefaultFetchAdapter()}
        widgets={exampleWidgets}
        defaultTheme="system"
        className="chat-app-frame"
      />
    </main>
  );
}
