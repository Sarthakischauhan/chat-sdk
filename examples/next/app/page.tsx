"use client";

import { ChatKit } from "@your-scope/chat";
import { createDefaultFetchAdapter } from "@/lib/adapters/fetch";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <ChatKit
        adapter={createDefaultFetchAdapter()}
        className="h-[min(760px,calc(100svh-2rem))] w-full max-w-3xl"
      />
    </main>
  );
}
