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
import type { ChatReference, ComposerAttachment } from "./types";

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read file"));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Could not read file"));
    };
    reader.readAsDataURL(file);
  });

type ComposerContextValue = {
  input: string;
  setInput: (value: string) => void;
  references: ChatReference[];
  addReference: (text: string) => void;
  removeReference: (id: string) => void;
  clearReferences: () => void;
  attachments: ComposerAttachment[];
  addFiles: (files: FileList | readonly File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
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
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const inputRef = useRef(input);
  const referencesRef = useRef(references);
  const attachmentsRef = useRef(attachments);
  inputRef.current = input;
  referencesRef.current = references;
  attachmentsRef.current = attachments;

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

  const addFiles = useCallback(async (list: FileList | readonly File[]) => {
    const incoming = Array.from(list);
    const next: ComposerAttachment[] = [];

    for (const file of incoming) {
      try {
        const url = await readFileAsDataUrl(file);
        next.push({
          id: createMessageId("file"),
          filename: file.name || "file",
          mediaType: file.type || "application/octet-stream",
          url,
        });
      } catch {
        // Skip a file the browser could not read. The rest still attach.
      }
    }

    if (next.length === 0) {
      return;
    }

    setAttachments((current) => [...current, ...next]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }, []);

  const disabled = isSending || isLoadingThread || !activeThreadId;
  const canSend = !disabled && (!!input.trim() || attachments.length > 0);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const submitInput = useCallback(async () => {
    const text = inputRef.current.trim();
    const threadId = activeThreadIdRef.current;
    const attachmentsSnapshot = attachmentsRef.current;

    if ((!text && attachmentsSnapshot.length === 0) || !threadId || disabledRef.current) {
      return;
    }

    const nextTitle = (text || attachmentsSnapshot[0]?.filename || "").slice(0, 60);
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
    setAttachments([]);

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
        {
          text: messageText,
          files: attachmentsSnapshot.map((file) => ({
            mediaType: file.mediaType,
            url: file.url,
            filename: file.filename,
          })),
        },
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
      setAttachments(attachmentsSnapshot);
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
      attachments,
      addFiles,
      removeAttachment,
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
      addFiles,
      attachments,
      references,
      removeAttachment,
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
