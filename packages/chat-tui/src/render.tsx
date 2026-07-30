import { render as inkRender, type Instance, type RenderOptions } from "ink";
import type { ReactNode } from "react";
import { Chat, type ChatProps } from "./components/Chat";

export type RenderChatOptions = RenderOptions &
  Pick<ChatProps, "adapter" | "defaultThreadId">;

/**
 * Mount the Ink chat UI. Returns the Ink instance (call `unmount()` to exit).
 */
export function renderChat({
  adapter,
  defaultThreadId,
  ...options
}: RenderChatOptions): Instance {
  return inkRender(
    <Chat adapter={adapter} defaultThreadId={defaultThreadId} />,
    options,
  );
}

export function render(tree: ReactNode, options?: RenderOptions): Instance {
  return inkRender(tree, options);
}
