"use client";

import { Chat } from "@sarchauhan/chat";
import { createDefaultFetchAdapter } from "@/lib/adapters/fetch";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <Chat
        adapter={createDefaultFetchAdapter()}
        className="h-[min(760px,calc(100svh-2rem))] w-full max-w-3xl"
      />
    </main>
  );
}
