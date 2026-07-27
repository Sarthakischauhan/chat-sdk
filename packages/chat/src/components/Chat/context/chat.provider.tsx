"use client";

import type { ReactNode } from "react";
import type { ChatAdapter } from "../../../types";
import { ComposerProvider } from "./composer.context";
import { MessagesProvider } from "./messages.context";
import { ModelProvider } from "./model.context";
import { ThreadProvider } from "./thread.context";
import { ProviderId } from "./types";

export type ChatContextProviderProps = {
  adapter: ChatAdapter;
  children: ReactNode;
  defaultProvider?: ProviderId;
  defaultThreadId?: string;
  registryUrl?: string;
};

export function ChatContextProvider({
  adapter,
  children,
  defaultProvider = ProviderId.OLLAMA,
  defaultThreadId,
  registryUrl = "/api/ai/registry",
}: ChatContextProviderProps) {
  return (
    <ModelProvider defaultProvider={defaultProvider} registryUrl={registryUrl}>
      <ThreadProvider adapter={adapter} defaultThreadId={defaultThreadId}>
        <MessagesProvider adapter={adapter}>
          <ComposerProvider>{children}</ComposerProvider>
        </MessagesProvider>
      </ThreadProvider>
    </ModelProvider>
  );
}
