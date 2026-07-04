import { ChatKit } from "@your-scope/chat";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <ChatKit className="h-[min(760px,calc(100svh-2rem))] w-full max-w-3xl" />
    </main>
  );
}
