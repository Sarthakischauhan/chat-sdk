"use client";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat as useAiChat } from "@ai-sdk/react";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { ChatTooltip } from "./chat.tooltip";
import { getUserDisplayText } from "../../lib/message/user";

export enum ProviderId{
    OPENAI = "openai", 
    GOOGLE = "google", 
    CLAUDE = "anthropic",
    OLLAMA = "ollama"
}

export type ChatStatus = "submitted" | "streaming" | "ready" | "error";

export type SendMessage = (
  message: { text: string },
  options?: { body?: { provider?: string } },
) => Promise<void>;

type ChatAction = {
    type : "setInput";
    data : { input : string}
} | {
    type : "setProvider";
    data : { provider : ProviderId}    
} | {
    type : "addReference";
    data : { text : string}
} | {
    type : "removeReference";
    data : { id : string}
} | {
    type : "clearReferences";
}

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
  messages: UIMessage[];
  status: ChatStatus;
  activeThreadId: string | null;
  threads: { id: string; title: string }[];
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

const intialState: ChatReducerState = {
  input: "",
  provider: ProviderId.OLLAMA,
  references: [],
};

const normalizeReferenceText = (text: string) =>
  text.replace(/\s+/g, " ").trim().slice(0, 4000);

const reducer = (state: ChatReducerState, action: ChatAction) => {
  switch (action.type) {
    case "setInput":
      return { ...state, input: action.data?.input };
    case "setProvider":
      return { ...state, provider: action.data?.provider };
    case "addReference": {
      const text = normalizeReferenceText(action.data.text);
      
      // don't update if the text is same or selected text is none
      if (!text || state.references.some((reference) => reference.text === text)) {
        return state;
      }

      return {
        ...state,
        references: [
          ...state.references,
          {
            id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${state.references.length}`,
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
  children: ReactNode;
};

export const ChatContextProvider = ({ children }: ChatContextProviderProps) => {
  const [chatState, dispatch] = useReducer(reducer, intialState);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<{ id: string; title: string }[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(true);
  const addReference = useCallback((text: string) => {
    dispatch({ type: "addReference", data: { text } });
  }, []);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest({ id, messages, body }) {
          return {
            body: {
              id,
              message: messages[messages.length - 1],
              provider: body?.provider,
            },
          };
        },
      }),
    [],
  );
  const { messages, sendMessage, setMessages, status, stop } = useAiChat({
    id: activeThreadId ?? "thread-pending",
    transport,
  });
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
      const response = await fetch("/api/threads", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        threads: { id: string; title: string }[];
      };

      if (cancelled) {
        return;
      }

      if (data.threads.length > 0) {
        setThreads(data.threads);
        setActiveThreadId(data.threads[0].id);
        return;
      }

      const createResponse = await fetch("/api/threads", {
        method: "POST",
      });
      const createData = (await createResponse.json()) as {
        thread: { id: string; title: string };
      };

      if (cancelled) {
        return;
      }

      setThreads([createData.thread]);
      setActiveThreadId(createData.thread.id);
    };

    bootstrap().catch(() => {
      if (!cancelled) {
        setIsLoadingThread(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      if (!activeThreadId) {
        setMessages([]);
        setIsLoadingThread(false);
        return;
      }

      setIsLoadingThread(true);
      const response = await fetch(`/api/threads/${activeThreadId}/messages`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { messages: UIMessage[] };

      if (cancelled) {
        return;
      }

      setMessages(data.messages);
      setIsLoadingThread(false);
    };

    loadMessages().catch(() => {
      if (!cancelled) {
        setMessages([]);
        setIsLoadingThread(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeThreadId, setMessages]);

  const selectThread = async (threadId: string) => {
    if (threadId === activeThreadId) {
      return;
    }

    setActiveThreadId(threadId);
  };

  const createThread = async () => {
    const response = await fetch("/api/threads", {
      method: "POST",
    });
    const data = (await response.json()) as {
      thread: { id: string; title: string };
    };

    setThreads((current) => [data.thread, ...current]);
    setActiveThreadId(data.thread.id);
  };

  const deleteThread = async (threadId: string) => {
    const response = await fetch(`/api/threads/${threadId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete thread");
    }

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

    const threadResponse = await fetch("/api/threads", {
      method: "POST",
    });
    const data = (await threadResponse.json()) as {
      thread: { id: string; title: string };
    };

    setThreads([data.thread]);
    setActiveThreadId(data.thread.id);
  };

  const submitInput = async () => {
    const text = chatState.input.trim();
    if (!text || !activeThreadId) {
      return;
    }

    const provider = chatState.provider;
    const nextTitle = text.slice(0, 60);
    const referenceText = chatState.references
      .map((reference, index) => `<reference ${index + 1}>\n${reference.text}\n</reference ${index + 1}>`)
      .join("\n\n");
    
    // combine the user selected reference + the message sent by the user.
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
      chatState.references.forEach((reference) => {
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
    let editedMessages: UIMessage[] | null = null;

    setThreads((current) => {
      const editedMessages = previousMessages
        .slice(0, messageIndex + 1)
        .map((currentMessage) =>
          currentMessage.id === messageId
            ? {
                ...currentMessage,
                parts: [{ type: "text" as const, text: trimmedText }],
              }
            : currentMessage,
        );
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
      const response = await fetch(`/api/threads/${activeThreadId}/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: trimmedText }),
      });

      if (!response.ok) {
        throw new Error("Failed to edit message");
      }

      const data = (await response.json()) as { messages: UIMessage[] };
      editedMessages = data.messages;
      setMessages(data.messages);

      await sendMessage({ text: trimmedText }, { body: { provider } });
    } catch (error) {
      setMessages(editedMessages ?? previousMessages);
      throw error;
    }
  };

  const stopResponse = () => {
    if (isSending) {
      stop();
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
