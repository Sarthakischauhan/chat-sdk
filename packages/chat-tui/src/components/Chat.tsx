import { Box } from "ink";
import type { ChatAdapter } from "../types";
import { ChatProvider } from "./Chat/chat.context";
import { ChatComposer } from "./Chat/chat.composer";
import { MessageList } from "./Message/message";

export type ChatProps = {
  adapter: ChatAdapter;
  defaultThreadId?: string;
};

/**
 * Terminal chat shell — same adapter contract as `@sarchauhan/chat`.
 */
export function Chat({ adapter, defaultThreadId }: ChatProps) {
  return (
    <ChatProvider adapter={adapter} defaultThreadId={defaultThreadId}>
      <Box flexDirection="column" width="100%" height="100%">
        <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
          <MessageList />
        </Box>
        <ChatComposer />
      </Box>
    </ChatProvider>
  );
}
