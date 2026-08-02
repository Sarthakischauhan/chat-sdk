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
import type { ChatAdapter, ChatMessage, ChatStatus, SendMessage } from "../../types";
import { createUserMessage, upsertAssistantMessage } from "../../lib/message";

type ChatContextValue = {
  messages: ChatMessage[];
  status: ChatStatus;
  isSending: boolean;
  isLoadingThread: boolean;
  threadId: string | null;
  sendMessage: SendMessage;
  stopResponse: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

type ChatProviderProps = {
  adapter: ChatAdapter;
  defaultThreadId?: string;
  children: ReactNode;
};

export function ChatProvider({
  adapter,
  defaultThreadId,
  children,
}: ChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [isLoadingThread, setIsLoadingThread] = useState(true);
  const [threadId, setThreadId] = useState<string | null>(defaultThreadId ?? null);

  const messagesRef = useRef(messages);
  const statusRef = useRef(status);
  const threadIdRef = useRef(threadId);
  const adapterRef = useRef(adapter);
  const abortRef = useRef<AbortController | null>(null);

  messagesRef.current = messages;
  statusRef.current = status;
  threadIdRef.current = threadId;
  adapterRef.current = adapter;

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsLoadingThread(true);

      try {
        let nextThreadId = defaultThreadId ?? null;

        if (!nextThreadId && adapterRef.current.listThreads) {
          const threads = await adapterRef.current.listThreads();
          nextThreadId = threads[0]?.id ?? null;
        }

        if (!nextThreadId && adapterRef.current.createThread) {
          const thread = await adapterRef.current.createThread();
          nextThreadId = thread.id;
        }

        if (!nextThreadId) {
          nextThreadId = "local";
        }

        if (cancelled) {
          return;
        }

        setThreadId(nextThreadId);

        if (adapterRef.current.loadMessages && nextThreadId !== "local") {
          const loaded = await adapterRef.current.loadMessages(nextThreadId);
          if (!cancelled) {
            setMessages(loaded);
          }
        } else if (!cancelled) {
          setMessages([]);
        }
      } catch {
        if (!cancelled) {
          setThreadId((current) => current ?? "local");
          setMessages([]);
          setStatus("error");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingThread(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [defaultThreadId]);

  const streamMessage = useCallback(
    async ({
      message,
      nextMessages,
      provider,
      model,
    }: {
      message: ChatMessage;
      nextMessages: ChatMessage[];
      provider?: string;
      model?: string;
    }) => {
      const activeThreadId = threadIdRef.current;
      if (!activeThreadId) {
        return;
      }

      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;
      setStatus("submitted");

      try {
        for await (const assistantMessage of adapterRef.current.sendMessage({
          threadId: activeThreadId,
          message,
          messages: nextMessages,
          provider,
          model,
          signal: abortController.signal,
        })) {
          setStatus("streaming");
          setMessages((current) => upsertAssistantMessage(current, assistantMessage));
        }

        setStatus("ready");
      } catch (error) {
        if (abortController.signal.aborted) {
          setStatus("ready");
          return;
        }

        setStatus("error");
        throw error;
      } finally {
        if (abortRef.current === abortController) {
          abortRef.current = null;
        }
      }
    },
    [],
  );

  const sendMessage = useCallback<SendMessage>(
    async (message, options) => {
      const text = message.text.trim();
      const activeThreadId = threadIdRef.current;

      if (!text || !activeThreadId) {
        return;
      }

      const userMessage = createUserMessage(text);
      const nextMessages = [...messagesRef.current, userMessage];
      setMessages(nextMessages);

      await streamMessage({
        message: userMessage,
        nextMessages,
        provider: options?.body?.provider,
        model: options?.body?.model,
      });
    },
    [streamMessage],
  );

  const stopResponse = useCallback(() => {
    const isSending =
      statusRef.current === "submitted" || statusRef.current === "streaming";
    if (!isSending) {
      return;
    }

    abortRef.current?.abort();
    setStatus("ready");
  }, []);

  const isSending = status === "submitted" || status === "streaming";

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      status,
      isSending,
      isLoadingThread,
      threadId,
      sendMessage,
      stopResponse,
    }),
    [
      isLoadingThread,
      isSending,
      messages,
      sendMessage,
      status,
      stopResponse,
      threadId,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used inside ChatProvider");
  }
  return context;
}
