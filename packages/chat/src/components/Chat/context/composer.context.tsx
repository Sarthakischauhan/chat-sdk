"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChatTooltip } from "../chat.tooltip";
import { createMessageId, normalizeReferenceText } from "./message.helpers";
import { useMessages } from "./messages.context";
import { useModel } from "./model.context";
import { useThread } from "./thread.context";
import type { ChatReference } from "./types";

type ComposerContextValue = {
  input: string;
  setInput: (value: string) => void;
  references: ChatReference[];
  addReference: (text: string) => void;
  removeReference: (id: string) => void;
  clearReferences: () => void;
  disabled: boolean;
  canSend: boolean;
  submitInput: () => Promise<void>;
};

const ComposerContext = createContext<ComposerContextValue | null>(null);

type ComposerProviderProps = {
  children: ReactNode;
};

export function ComposerProvider({ children }: ComposerProviderProps) {
  const { activeThreadId, activeThreadIdRef, isLoadingThread, setThreads } = useThread();
  const { providerRef, modelRef } = useModel();
  const { sendMessage, isSending } = useMessages();

  // Local composer state — typing does not hop through a shared reducer/context mega-object.
  const [input, setInputState] = useState("");
  const [references, setReferences] = useState<ChatReference[]>([]);
  const inputRef = useRef(input);
  const referencesRef = useRef(references);
  inputRef.current = input;
  referencesRef.current = references;

  const setInput = useCallback((value: string) => {
    setInputState(value);
  }, []);

  const addReference = useCallback((text: string) => {
    const normalized = normalizeReferenceText(text);
    if (!normalized) {
      return;
    }

    setReferences((current) => {
      if (current.some((reference) => reference.text === normalized)) {
        return current;
      }

      return [
        ...current,
        {
          id: createMessageId("ref"),
          text: normalized,
        },
      ];
    });
  }, []);

  const removeReference = useCallback((id: string) => {
    setReferences((current) => current.filter((reference) => reference.id !== id));
  }, []);

  const clearReferences = useCallback(() => {
    setReferences([]);
  }, []);

  const disabled = isSending || isLoadingThread || !activeThreadId;
  const canSend = !disabled && !!input.trim();
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const submitInput = useCallback(async () => {
    const text = inputRef.current.trim();
    const threadId = activeThreadIdRef.current;

    if (!text || !threadId || disabledRef.current) {
      return;
    }

    const nextTitle = text.slice(0, 60);
    const referencesSnapshot = referencesRef.current;
    const referenceText = referencesSnapshot
      .map(
        (reference, index) =>
          `<reference ${index + 1}>\n${reference.text}\n</reference ${index + 1}>`,
      )
      .join("\n\n");

    const messageText = referenceText
      ? `Use the following selected references as context:\n\n${referenceText}\n\nUser message:\n${text}`
      : text;

    setInputState("");
    setReferences([]);

    setThreads((current) => {
      const next = current.map((thread) =>
        thread.id === threadId && thread.title === "New chat"
          ? { ...thread, title: nextTitle || thread.title }
          : thread,
      );
      const selected = next.find((thread) => thread.id === threadId);
      const remaining = next.filter((thread) => thread.id !== threadId);
      return selected ? [selected, ...remaining] : next;
    });

    try {
      await sendMessage(
        { text: messageText },
        {
          body: {
            provider: providerRef.current,
            model: modelRef.current,
          },
        },
      );
    } catch (error) {
      setInputState(text);
      setReferences(referencesSnapshot);
      throw error;
    }
  }, [activeThreadIdRef, modelRef, providerRef, sendMessage, setThreads]);

  const value = useMemo<ComposerContextValue>(
    () => ({
      input,
      setInput,
      references,
      addReference,
      removeReference,
      clearReferences,
      disabled,
      canSend,
      submitInput,
    }),
    [
      addReference,
      canSend,
      clearReferences,
      disabled,
      input,
      references,
      removeReference,
      setInput,
      submitInput,
    ],
  );

  return (
    <ComposerContext.Provider value={value}>
      {children}
      <ChatTooltip onAddReference={addReference} />
    </ComposerContext.Provider>
  );
}

export function useComposer() {
  const context = useContext(ComposerContext);
  if (!context) {
    throw new Error("useComposer must be used inside ComposerProvider");
  }
  return context;
}
