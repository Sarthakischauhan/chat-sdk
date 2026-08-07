import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createMessageId,
  createUserMessage,
  upsertAssistantMessage,
} from "@sarchauhan/adapter";
import type { ChatMessage, ChatStatus, ChatThread, SendMessage } from "../../types";
import type {
  ChatContextValue,
  ChatProviderProps,
  FocusPane,
  ModelOption,
} from "./chat.types";

const DEFAULT_MODELS: ModelOption[] = [
  { id: "llama3.2", label: "llama3.2", provider: "ollama" },
  { id: "gpt-4o-mini", label: "gpt-4o-mini", provider: "openai" },
  { id: "claude-sonnet-4-5", label: "claude-sonnet-4-5", provider: "anthropic" },
];

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({
  adapter,
  defaultThreadId,
  defaultProvider = "ollama",
  defaultModel = "llama3.2",
  models = DEFAULT_MODELS,
  children,
}: ChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [isLoadingThread, setIsLoadingThread] = useState(true);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(defaultThreadId ?? null);
  const [provider, setProviderState] = useState(defaultProvider);
  const [model, setModelState] = useState(defaultModel);
  const [input, setInput] = useState("");
  const [focus, setFocus] = useState<FocusPane>("composer");
  const [showHelp, setShowHelp] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);

  const messagesRef = useRef(messages);
  const statusRef = useRef(status);
  const threadIdRef = useRef(threadId);
  const providerRef = useRef(provider);
  const modelRef = useRef(model);
  const adapterRef = useRef(adapter);
  const abortRef = useRef<AbortController | null>(null);

  messagesRef.current = messages;
  statusRef.current = status;
  threadIdRef.current = threadId;
  providerRef.current = provider;
  modelRef.current = model;
  adapterRef.current = adapter;

  const loadThreadMessages = useCallback(async (nextThreadId: string) => {
    setIsLoadingThread(true);
    try {
      if (adapterRef.current.loadMessages && nextThreadId !== "local") {
        const loaded = await adapterRef.current.loadMessages(nextThreadId);
        setMessages(loaded);
      } else {
        setMessages([]);
      }
      setScrollOffset(0);
    } catch {
      setMessages([]);
      setStatus("error");
    } finally {
      setIsLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsLoadingThread(true);

      try {
        let nextThreads: ChatThread[] = [];
        let nextThreadId = defaultThreadId ?? null;

        if (adapterRef.current.listThreads) {
          nextThreads = await adapterRef.current.listThreads();
        }

        if (!nextThreadId) {
          nextThreadId = nextThreads[0]?.id ?? null;
        }

        if (!nextThreadId && adapterRef.current.createThread) {
          const thread = await adapterRef.current.createThread();
          nextThreads = [thread, ...nextThreads];
          nextThreadId = thread.id;
        }

        if (!nextThreadId) {
          nextThreadId = "local";
          nextThreads = [{ id: "local", title: "Local chat" }];
        } else if (!nextThreads.some((thread) => thread.id === nextThreadId)) {
          nextThreads = [{ id: nextThreadId, title: "Chat" }, ...nextThreads];
        }

        if (cancelled) {
          return;
        }

        setThreads(nextThreads);
        setThreadId(nextThreadId);
        await loadThreadMessages(nextThreadId);
      } catch {
        if (!cancelled) {
          setThreads([{ id: "local", title: "Local chat" }]);
          setThreadId("local");
          setMessages([]);
          setStatus("error");
          setIsLoadingThread(false);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [defaultThreadId, loadThreadMessages]);

  const streamMessage = useCallback(
    async ({
      message,
      nextMessages,
      provider: nextProvider,
      model: nextModel,
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
      setScrollOffset(0);

      try {
        for await (const assistantMessage of adapterRef.current.sendMessage({
          threadId: activeThreadId,
          message,
          messages: nextMessages,
          provider: nextProvider ?? providerRef.current,
          model: nextModel ?? modelRef.current,
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
      setInput("");

      await streamMessage({
        message: userMessage,
        nextMessages,
        provider: options?.body?.provider,
        model: options?.body?.model,
      });
    },
    [streamMessage],
  );

  const submitInput = useCallback(async () => {
    const text = input.trim();
    if (!text || statusRef.current === "submitted" || statusRef.current === "streaming") {
      return;
    }
    try {
      await sendMessage({ text });
    } catch {
      // streamMessage records the error in status; keep the TUI alive so the
      // user can correct the connection or retry the request.
    }
  }, [input, sendMessage]);

  const stopResponse = useCallback(() => {
    const isSending =
      statusRef.current === "submitted" || statusRef.current === "streaming";
    if (!isSending) {
      return;
    }

    abortRef.current?.abort();
    setStatus("ready");
  }, []);

  const selectThread = useCallback(
    async (nextThreadId: string) => {
      if (nextThreadId === threadIdRef.current) {
        return;
      }

      abortRef.current?.abort();
      setStatus("ready");
      setThreadId(nextThreadId);
      setFocus("messages");
      await loadThreadMessages(nextThreadId);
    },
    [loadThreadMessages],
  );

  const createThread = useCallback(async () => {
    const thread = adapterRef.current.createThread
      ? await adapterRef.current.createThread()
      : { id: createMessageId("thread"), title: "New chat" };

    setThreads((current) => [thread, ...current]);
    setThreadId(thread.id);
    setMessages([]);
    setScrollOffset(0);
    setFocus("composer");
    setStatus("ready");
  }, []);

  const deleteThread = useCallback(
    async (targetId: string) => {
      if (adapterRef.current.deleteThread && targetId !== "local") {
        await adapterRef.current.deleteThread(targetId);
      }

      const remaining = threads.filter((thread) => thread.id !== targetId);
      const nextThreads =
        remaining.length > 0 ? remaining : [{ id: "local", title: "Local chat" }];
      const fallback = nextThreads[0]?.id ?? "local";

      setThreads(nextThreads);

      if (threadIdRef.current === targetId) {
        setThreadId(fallback);
        await loadThreadMessages(fallback);
      }
    },
    [loadThreadMessages, threads],
  );

  const editAndResendMessage = useCallback(
    async (messageId: string, text: string) => {
      const trimmed = text.trim();
      const activeThreadId = threadIdRef.current;
      const isSending =
        statusRef.current === "submitted" || statusRef.current === "streaming";

      if (!trimmed || !activeThreadId || isSending) {
        return;
      }

      const previous = messagesRef.current;
      const index = previous.findIndex((message) => message.id === messageId);
      const message = previous[index];

      if (!message || message.role !== "user") {
        return;
      }

      let editedMessages = previous.slice(0, index + 1).map((entry) =>
        entry.id === messageId
          ? { ...entry, parts: [{ type: "text" as const, text: trimmed }] }
          : entry,
      );

      try {
        if (adapterRef.current.editMessage) {
          editedMessages = await adapterRef.current.editMessage({
            threadId: activeThreadId,
            messageId,
            text: trimmed,
          });
        }

        const editedMessage =
          editedMessages.find((entry) => entry.id === messageId) ??
          createUserMessage(trimmed);

        setMessages(editedMessages);
        await streamMessage({
          message: editedMessage,
          nextMessages: editedMessages,
        });
      } catch {
        setMessages(previous);
        setStatus("error");
      }
    },
    [streamMessage],
  );

  const setProvider = useCallback((nextProvider: string, nextModel?: string) => {
    setProviderState(nextProvider);
    if (nextModel) {
      setModelState(nextModel);
      return;
    }

    const match = models.find((entry) => entry.provider === nextProvider);
    if (match) {
      setModelState(match.id);
    }
  }, [models]);

  const setModel = useCallback(
    (nextModel: string) => {
      setModelState(nextModel);
      const match = models.find((entry) => entry.id === nextModel);
      if (match) {
        setProviderState(match.provider);
      }
    },
    [models],
  );

  const cycleModel = useCallback(
    (direction: 1 | -1) => {
      if (models.length === 0) {
        return;
      }

      const index = Math.max(
        0,
        models.findIndex((entry) => entry.id === modelRef.current),
      );
      const next = models[(index + direction + models.length) % models.length];
      setModelState(next.id);
      setProviderState(next.provider);
    },
    [models],
  );

  const isSending = status === "submitted" || status === "streaming";

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      status,
      isSending,
      isLoadingThread,
      threads,
      threadId,
      provider,
      model,
      models,
      input,
      setInput,
      focus,
      setFocus,
      showHelp,
      setShowHelp,
      scrollOffset,
      setScrollOffset,
      sendMessage,
      submitInput,
      stopResponse,
      selectThread,
      createThread,
      deleteThread,
      editAndResendMessage,
      setProvider,
      setModel,
      cycleModel,
    }),
    [
      createThread,
      cycleModel,
      deleteThread,
      editAndResendMessage,
      focus,
      input,
      isLoadingThread,
      isSending,
      messages,
      model,
      models,
      provider,
      scrollOffset,
      selectThread,
      sendMessage,
      setModel,
      setProvider,
      showHelp,
      status,
      stopResponse,
      submitInput,
      threadId,
      threads,
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
