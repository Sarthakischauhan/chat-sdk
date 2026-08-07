import React from "react";
import type { ChatAdapter } from "../types";
import type { ModelOption } from "./Chat/chat.types";
import { ChatProvider } from "./Chat/chat.context";
import { ChatLayout, type ChatLayoutProps } from "./Chat/chat.layout";

export type ChatProps = ChatLayoutProps & {
  adapter: ChatAdapter;
  defaultThreadId?: string;
  defaultProvider?: string;
  defaultModel?: string;
  models?: ModelOption[];
  /** Show the thread sidebar when mode="classic" (default true). */
  showThreads?: boolean;
};

/**
 * Terminal chat shell — same adapter contract as `@sarchauhan/chat`.
 */
export function Chat({
  adapter,
  defaultThreadId,
  defaultProvider,
  defaultModel,
  models,
  showThreads = true,
  footerHeight,
  mode,
}: ChatProps) {
  return (
    <ChatProvider
      adapter={adapter}
      defaultThreadId={defaultThreadId}
      defaultProvider={defaultProvider}
      defaultModel={defaultModel}
      models={models}
    >
      <ChatLayout
        mode={mode}
        showThreads={showThreads}
        footerHeight={footerHeight}
      />
    </ChatProvider>
  );
}
