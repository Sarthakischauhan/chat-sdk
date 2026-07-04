"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { createDefaultFetchAdapter } from "../../adapters/fetch";
import type { ChatAdapter, ChatMessage, ChatStatus, ChatThread } from "../../types";
import { getUserDisplayText } from "../../lib/message/user";
import { ChatTooltip } from "./chat.tooltip";

export enum ProviderId {
  OPENAI = "openai",
  GOOGLE = "google",
  CLAUDE = "anthropic",
  OLLAMA = "ollama",
}

export type { ChatAdapter, ChatMessage, ChatStatus, ChatThread };

export type SendMessage = (
  message: { text: string },
  options?: { body?: { provider?: string } },
) => Promise<void>;

type ChatAction =
  | {
      type: "setInput";
      data: { input: string };
    }
  | {
      type: "setProvider";
      data: { provider: ProviderId };
    }
  | {
      type: "addReference";
      data: { text: string };
    }
  | {
      type: "removeReference";
      data: { id: string };
    }
  | {
      type: "clearReferences";
    };

type ChatState = {
  input: string;
  provider: ProviderId;
  references: ChatReference[];
  disabled: boolean;
  sendDisabled: boolean;
};

export type ChatReference = {
  id: string;
  text: string;
};

type ChatContextType = {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  messages: ChatMessage[];
  status: ChatStatus;
  activeThreadId: string | null;
  threads: ChatThread[];
  isLoadingThread: boolean;
  sendMessage: SendMessage;
  submitInput: () => Promise<void>;
  editAndResendMessage: (messageId: string, text: string) => Promise<void>;
  stopResponse: () => void;
  selectThread: (threadId: string) => Promise<void>;
  createThread: () => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
};

type ChatReducerState = Pick<ChatState, "input" | "provider" | "references">;

const defaultFetchAdapter = createDefaultFetchAdapter();

const initialState: ChatReducerState = {
  input: "",
  provider: ProviderId.OLLAMA,
  references: [],
};

const normalizeReferenceText = (text: string) =>
  text.replace(/\s+/g, " ").trim().slice(0, 4000);

const createMessageId = (prefix: string) =>
  globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createUserMessage = (text: string): ChatMessage => ({
  id: createMessageId("msg"),
  role: "user",
  parts: [{ type: "text", text }],
});

const updateMessageText = (message: ChatMessage, text: string): ChatMessage => ({
  ...message,
  parts: [{ type: "text", text }],
});

const upsertAssistantMessage = (current: ChatMessage[], nextMessage: ChatMessage) => {
  const existingIndex = current.findIndex((message) => message.id === nextMessage.id);

  if (existingIndex === -1) {
    return [...current, nextMessage];
  }

  return current.map((message, index) => (index === existingIndex ? nextMessage : message));
};

const reducer = (state: ChatReducerState, action: ChatAction) => {
  switch (action.type) {
    case "setInput":
      return { ...state, input: action.data.input };
    case "setProvider":
      return { ...state, provider: action.data.provider };
    case "addReference": {
      const text = normalizeReferenceText(action.data.text);

      if (!text || state.references.some((reference) => reference.text === text)) {
        return state;
      }

      return {
        ...state,
        references: [
          ...state.references,
          {
            id: createMessageId("ref"),
            text,
          },
        ],
      };
    }
    case "removeReference":
      return {
        ...state,
        references: state.references.filter((reference) => reference.id !== action.data.id),
      };
    case "clearReferences":
      return { ...state, references: [] };
    default:
      return state;
  }
};

const ChatContext = createContext<ChatContextType | null>(null);

type ChatContextProviderProps = {
  adapter?: ChatAdapter;
  children: ReactNode;
  defaultProvider?: ProviderId;
  defaultThreadId?: string;
};

export const ChatContextProvider = ({
  adapter = defaultFetchAdapter,
  children,
  defaultProvider = ProviderId.OLLAMA,
  defaultThreadId,
}: ChatContextProviderProps) => {
  const [chatState, dispatch] = useReducer(reducer, {
    ...initialState,
    provider: defaultProvider,
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(defaultThreadId ?? null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const addReference = useCallback((text: string) => {
    dispatch({ type: "addReference", data: { text } });
  }, []);

  const isSending = status === "submitted" || status === "streaming";
  const state = useMemo<ChatState>(() => {
    const disabled = isSending || isLoadingThread || !activeThreadId;

    return {
      ...chatState,
      disabled,
      sendDisabled: disabled || !chatState.input.trim(),
    };
  }, [activeThreadId, chatState, isLoadingThread, isSending]);

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

      if (!adapter.listThreads || !adapter.createThread) {
        const localThread = { id: createMessageId("thread"), title: "New chat" };
        setThreads([localThread]);
        setActiveThreadId(localThread.id);
        setIsLoadingThread(false);
        return;
      }

      const nextThreads = await adapter.listThreads();

      if (cancelled) {
        return;
      }

      if (nextThreads.length > 0) {
        setThreads(nextThreads);
        setActiveThreadId(nextThreads[0].id);
        setIsLoadingThread(false);
        return;
      }

      const thread = await adapter.createThread();

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
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [adapter, defaultThreadId]);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      if (!activeThreadId) {
        setMessages([]);
        setIsLoadingThread(false);
        return;
      }

      if (!adapter.loadMessages) {
        setIsLoadingThread(false);
        return;
      }

      setIsLoadingThread(true);
      const nextMessages = await adapter.loadMessages(activeThreadId);

      if (cancelled) {
        return;
      }

      setMessages(nextMessages);
      setIsLoadingThread(false);
    };

    loadMessages().catch(() => {
      if (!cancelled) {
        setMessages([]);
        setIsLoadingThread(false);
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeThreadId, adapter]);

  const streamMessage = useCallback(
    async ({
      message,
      nextMessages,
      provider,
    }: {
      message: ChatMessage;
      nextMessages: ChatMessage[];
      provider?: string;
    }) => {
      if (!activeThreadId) {
        return;
      }

      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;
      setStatus("submitted");

      try {
        for await (const assistantMessage of adapter.sendMessage({
          threadId: activeThreadId,
          message,
          messages: nextMessages,
          provider,
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
    [activeThreadId, adapter],
  );

  const sendMessage: SendMessage = useCallback(
    async (message, options) => {
      const text = message.text.trim();

      if (!text || !activeThreadId) {
        return;
      }

      const userMessage = createUserMessage(text);
      const nextMessages = [...messages, userMessage];

      setMessages(nextMessages);

      await streamMessage({
        message: userMessage,
        nextMessages,
        provider: options?.body?.provider,
      });
    },
    [activeThreadId, messages, streamMessage],
  );

  const selectThread = async (threadId: string) => {
    if (threadId === activeThreadId) {
      return;
    }

    setActiveThreadId(threadId);
  };

  const createThread = async () => {
    const thread = adapter.createThread
      ? await adapter.createThread()
      : { id: createMessageId("thread"), title: "New chat" };

    setThreads((current) => [thread, ...current]);
    setActiveThreadId(thread.id);
  };

  const deleteThread = async (threadId: string) => {
    await adapter.deleteThread?.(threadId);

    const remainingThreads = threads.filter((thread) => thread.id !== threadId);
    setThreads(remainingThreads);

    if (activeThreadId !== threadId) {
      return;
    }

    const nextActiveThreadId = remainingThreads[0]?.id ?? null;
    setActiveThreadId(nextActiveThreadId);

    if (nextActiveThreadId) {
      return;
    }

    await createThread();
  };

  const submitInput = async () => {
    const text = chatState.input.trim();
    if (!text || !activeThreadId) {
      return;
    }

    const provider = chatState.provider;
    const nextTitle = text.slice(0, 60);
    const referencesSnapshot = chatState.references;
    const referenceText = referencesSnapshot
      .map((reference, index) => `<reference ${index + 1}>\n${reference.text}\n</reference ${index + 1}>`)
      .join("\n\n");

    const messageText = referenceText
      ? `Use the following selected references as context:\n\n${referenceText}\n\nUser message:\n${text}`
      : text;

    dispatch({ type: "setInput", data: { input: "" } });
    dispatch({ type: "clearReferences" });
    setThreads((current) => {
      const next = current.map((thread) =>
        thread.id === activeThreadId && thread.title === "New chat"
          ? { ...thread, title: nextTitle || thread.title }
          : thread,
      );
      const selected = next.find((thread) => thread.id === activeThreadId);
      const remaining = next.filter((thread) => thread.id !== activeThreadId);
      return selected ? [selected, ...remaining] : next;
    });

    try {
      await sendMessage({ text: messageText }, { body: { provider } });
    } catch (error) {
      dispatch({ type: "setInput", data: { input: text } });
      referencesSnapshot.forEach((reference) => {
        dispatch({ type: "addReference", data: { text: reference.text } });
      });
      throw error;
    }
  };

  const editAndResendMessage = async (messageId: string, text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || !activeThreadId || isSending) {
      return;
    }

    const messageIndex = messages.findIndex((message) => message.id === messageId);
    const message = messages[messageIndex];

    if (!message || message.role !== "user") {
      return;
    }

    const provider = chatState.provider;
    const previousMessages = messages;
    let editedMessages = previousMessages
      .slice(0, messageIndex + 1)
      .map((currentMessage) =>
        currentMessage.id === messageId
          ? updateMessageText(currentMessage, trimmedText)
          : currentMessage,
      );

    setThreads((current) => {
      const firstUserMessage = editedMessages.find((currentMessage) => currentMessage.role === "user");
      const firstUserTitle = firstUserMessage
        ? getUserDisplayText(firstUserMessage).trim().slice(0, 60)
        : "";

      return current.map((thread) =>
        thread.id === activeThreadId && firstUserTitle
          ? { ...thread, title: firstUserTitle }
          : thread,
      );
    });

    try {
      if (adapter.editMessage) {
        editedMessages = await adapter.editMessage({
          threadId: activeThreadId,
          messageId,
          text: trimmedText,
        });
      }

      const editedMessage =
        editedMessages.find((currentMessage) => currentMessage.id === messageId) ??
        updateMessageText(message, trimmedText);

      setMessages(editedMessages);

      await streamMessage({
        message: editedMessage,
        nextMessages: editedMessages,
        provider,
      });
    } catch (error) {
      setMessages(previousMessages);
      throw error;
    }
  };

  const stopResponse = () => {
    if (isSending) {
      abortRef.current?.abort();
      setStatus("ready");
    }
  };

  const defaultValue: ChatContextType = {
    state,
    dispatch,
    messages,
    status,
    activeThreadId,
    threads,
    isLoadingThread,
    sendMessage,
    submitInput,
    editAndResendMessage,
    stopResponse,
    selectThread,
    createThread,
    deleteThread,
  };

  return (
    <>
      <ChatContext.Provider value={defaultValue}>{children}</ChatContext.Provider>
      <ChatTooltip onAddReference={addReference} />
    </>
  );
};

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used inside ChatProvider");
  }
  return ctx;
}
