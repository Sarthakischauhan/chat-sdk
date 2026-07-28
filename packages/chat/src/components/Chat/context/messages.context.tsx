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
import type { ChatAdapter, ChatMessage, ChatStatus } from "../../../types";
import { getUserDisplayText } from "../../../lib/message/user";
import {
  createUserMessage,
  updateMessageText,
  upsertAssistantMessage,
} from "./message.helpers";
import { useModel } from "./model.context";
import { useThread } from "./thread.context";
import type { SendMessage } from "./types";

type MessagesContextValue = {
  messages: ChatMessage[];
  status: ChatStatus;
  isSending: boolean;
  sendMessage: SendMessage;
  editAndResendMessage: (messageId: string, text: string) => Promise<void>;
  stopResponse: () => void;
};

const MessagesContext = createContext<MessagesContextValue | null>(null);

type MessagesProviderProps = {
  adapter: ChatAdapter;
  children: ReactNode;
};

export function MessagesProvider({ adapter, children }: MessagesProviderProps) {
  const { activeThreadId, activeThreadIdRef, setThreads, setIsLoadingThread } = useThread();
  const { providerRef, modelRef } = useModel();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");

  const messagesRef = useRef(messages);
  const statusRef = useRef(status);
  const adapterRef = useRef(adapter);
  const abortRef = useRef<AbortController | null>(null);

  messagesRef.current = messages;
  statusRef.current = status;
  adapterRef.current = adapter;

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      if (!activeThreadId) {
        setMessages([]);
        setIsLoadingThread(false);
        return;
      }

      const currentAdapter = adapterRef.current;
      if (!currentAdapter.loadMessages) {
        setIsLoadingThread(false);
        return;
      }

      setIsLoadingThread(true);
      try {
        const nextMessages = await currentAdapter.loadMessages(activeThreadId);
        if (cancelled) {
          return;
        }
        setMessages(nextMessages);
        setIsLoadingThread(false);
      } catch {
        if (!cancelled) {
          setMessages([]);
          setIsLoadingThread(false);
          setStatus("error");
        }
      }
    };

    void loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeThreadId, setIsLoadingThread]);

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
      const threadId = activeThreadIdRef.current;
      if (!threadId) {
        return;
      }

      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;
      setStatus("submitted");

      try {
        for await (const assistantMessage of adapterRef.current.sendMessage({
          threadId,
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
    [activeThreadIdRef],
  );

  const sendMessage = useCallback<SendMessage>(
    async (message, options) => {
      const text = message.text.trim();
      const threadId = activeThreadIdRef.current;

      if (!text || !threadId) {
        return;
      }

      const userMessage = createUserMessage(text);
      const nextMessages = [...messagesRef.current, userMessage];
      setMessages(nextMessages);

      await streamMessage({
        message: userMessage,
        nextMessages,
        provider: options?.body?.provider ?? providerRef.current,
        model: options?.body?.model ?? modelRef.current,
      });
    },
    [activeThreadIdRef, modelRef, providerRef, streamMessage],
  );

  const editAndResendMessage = useCallback(
    async (messageId: string, text: string) => {
      const trimmedText = text.trim();
      const threadId = activeThreadIdRef.current;
      const isSending =
        statusRef.current === "submitted" || statusRef.current === "streaming";

      if (!trimmedText || !threadId || isSending) {
        return;
      }

      const previousMessages = messagesRef.current;
      const messageIndex = previousMessages.findIndex((message) => message.id === messageId);
      const message = previousMessages[messageIndex];

      if (!message || message.role !== "user") {
        return;
      }

      let editedMessages = previousMessages
        .slice(0, messageIndex + 1)
        .map((currentMessage) =>
          currentMessage.id === messageId
            ? updateMessageText(currentMessage, trimmedText)
            : currentMessage,
        );

      setThreads((current) => {
        const firstUserMessage = editedMessages.find(
          (currentMessage) => currentMessage.role === "user",
        );
        const firstUserTitle = firstUserMessage
          ? getUserDisplayText(firstUserMessage).trim().slice(0, 60)
          : "";

        return current.map((thread) =>
          thread.id === threadId && firstUserTitle
            ? { ...thread, title: firstUserTitle }
            : thread,
        );
      });

      try {
        if (adapterRef.current.editMessage) {
          editedMessages = await adapterRef.current.editMessage({
            threadId,
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
          provider: providerRef.current,
          model: modelRef.current,
        });
      } catch (error) {
        setMessages(previousMessages);
        throw error;
      }
    },
    [activeThreadIdRef, modelRef, providerRef, setThreads, streamMessage],
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

  const value = useMemo<MessagesContextValue>(
    () => ({
      messages,
      status,
      isSending,
      sendMessage,
      editAndResendMessage,
      stopResponse,
    }),
    [editAndResendMessage, isSending, messages, sendMessage, status, stopResponse],
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages must be used inside MessagesProvider");
  }
  return context;
}
