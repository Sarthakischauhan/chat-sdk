'use client';

import { ReactNode, useRef, useEffect } from 'react';

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ChatSidebar } from './chat.sidebar';
import { useChat } from './chat.context';

type ChatShellProps = {
  children: ReactNode;
  composer: ReactNode;
};

export function ChatShell({ children, composer }: ChatShellProps) {
  const { activeThreadId, threads, messages, status } = useChat();
  const activeChat = threads.find((thread) => thread.id === activeThreadId)?.title ?? 'New chat';
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "instant",
    });
  };

  useEffect(() => {
    const frame = requestAnimationFrame(scrollToBottom);

    return () => cancelAnimationFrame(frame);
  }, [messages, status]);

  return (
    <SidebarProvider>
      <ChatSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="md:hidden" />
          <div className="font-medium">{activeChat}</div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">
          <div ref={containerRef} className="shell-messages flex min-h-0 flex-1 px-6 py-6 pb-8 overflow-y-auto">
            <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">{children}</div>
          </div>
          <div className="sticky bottom-0 bg-background px-6 py-4">
            <div className="mx-auto w-full max-w-3xl">{composer}</div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
