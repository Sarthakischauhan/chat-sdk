"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ChatAdapter, ChatThread } from "../../../types";
import { createMessageId } from "./message.helpers";

type ThreadContextValue = {
  threads: ChatThread[];
  activeThreadId: string | null;
  isLoadingThread: boolean;
  activeThreadIdRef: React.MutableRefObject<string | null>;
  setThreads: React.Dispatch<React.SetStateAction<ChatThread[]>>;
  setIsLoadingThread: React.Dispatch<React.SetStateAction<boolean>>;
  selectThread: (threadId: string) => Promise<void>;
  createThread: () => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
};

const ThreadContext = createContext<ThreadContextValue | null>(null);

type ThreadProviderProps = {
  adapter: ChatAdapter;
  children: ReactNode;
  defaultThreadId?: string;
};

export function ThreadProvider({
  adapter,
  children,
  defaultThreadId,
}: ThreadProviderProps) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(defaultThreadId ?? null);
  const [isLoadingThread, setIsLoadingThread] = useState(true);

  const activeThreadIdRef = useRef(activeThreadId);
  activeThreadIdRef.current = activeThreadId;
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsLoadingThread(true);

      if (defaultThreadId) {
        setThreads((current) =>
          current.some((thread) => thread.id === defaultThreadId)
            ? current
            : [{ id: defaultThreadId, title: "New chat" }, ...current],
        );
        setActiveThreadId(defaultThreadId);
        setIsLoadingThread(false);
        return;
      }

      const currentAdapter = adapterRef.current;

      if (!currentAdapter.listThreads || !currentAdapter.createThread) {
        const localThread = { id: createMessageId("thread"), title: "New chat" };
        setThreads([localThread]);
        setActiveThreadId(localThread.id);
        setIsLoadingThread(false);
        return;
      }

      const nextThreads = await currentAdapter.listThreads();
      if (cancelled) {
        return;
      }

      if (nextThreads.length > 0) {
        setThreads(nextThreads);
        setActiveThreadId(nextThreads[0].id);
        setIsLoadingThread(false);
        return;
      }

      const thread = await currentAdapter.createThread();
      if (cancelled) {
        return;
      }

      setThreads([thread]);
      setActiveThreadId(thread.id);
      setIsLoadingThread(false);
    };

    bootstrap().catch(() => {
      if (!cancelled) {
        setIsLoadingThread(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [defaultThreadId]);

  const selectThread = useCallback(async (threadId: string) => {
    setActiveThreadId((current) => (current === threadId ? current : threadId));
  }, []);

  const createThread = useCallback(async () => {
    const currentAdapter = adapterRef.current;
    const thread = currentAdapter.createThread
      ? await currentAdapter.createThread()
      : { id: createMessageId("thread"), title: "New chat" };

    setThreads((current) => [thread, ...current]);
    setActiveThreadId(thread.id);
  }, []);

  const deleteThread = useCallback(
    async (threadId: string) => {
      await adapterRef.current.deleteThread?.(threadId);

      setThreads((current) => {
        const remaining = current.filter((thread) => thread.id !== threadId);

        setActiveThreadId((active) => {
          if (active !== threadId) {
            return active;
          }

          const nextActive = remaining[0]?.id ?? null;
          if (!nextActive) {
            void createThread();
          }
          return nextActive;
        });

        return remaining;
      });
    },
    [createThread],
  );

  const value = useMemo<ThreadContextValue>(
    () => ({
      threads,
      activeThreadId,
      isLoadingThread,
      activeThreadIdRef,
      setThreads,
      setIsLoadingThread,
      selectThread,
      createThread,
      deleteThread,
    }),
    [
      activeThreadId,
      createThread,
      deleteThread,
      isLoadingThread,
      selectThread,
      threads,
    ],
  );

  return <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>;
}

export function useThread() {
  const context = useContext(ThreadContext);
  if (!context) {
    throw new Error("useThread must be used inside ThreadProvider");
  }
  return context;
}
