import React, { type ReactNode } from "react";
import { render as inkRender, type Instance, type RenderOptions } from "ink";
import { Chat, type ChatProps } from "./components/Chat";

export type RenderChatOptions = RenderOptions & ChatProps;

/**
 * Mount the Ink chat UI. Returns the Ink instance (call `unmount()` to exit).
 */
export function renderChat({
  adapter,
  defaultThreadId,
  defaultProvider,
  defaultModel,
  models,
  showThreads,
  footerHeight,
  mode,
  alternateScreen = true,
  interactive = process.stdin.isTTY,
  ...options
}: RenderChatOptions): Instance {
  return inkRender(
    <Chat
      adapter={adapter}
      defaultThreadId={defaultThreadId}
      defaultProvider={defaultProvider}
      defaultModel={defaultModel}
      models={models}
      showThreads={showThreads}
      footerHeight={footerHeight}
      mode={mode}
    />,
    { alternateScreen, interactive, ...options },
  );
}

export function render(tree: ReactNode, options?: RenderOptions): Instance {
  return inkRender(tree, options);
}
