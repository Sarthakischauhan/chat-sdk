import type { AgentEvent, AgentMessage } from "@sarchauhan/protocol";
import {
  applyAgentEvent,
  createAgentMessageState,
} from "@sarchauhan/protocol";
import type { ChatMessage } from "./types";

/**
 * Reduce a protocol event stream into ChatMessage snapshots for
 * `ChatAdapter.sendMessage` yields.
 */
export async function* messagesFromEvents(
  events: AsyncIterable<AgentEvent>,
  seed?: Partial<AgentMessage>,
): AsyncGenerator<ChatMessage> {
  let state = createAgentMessageState(seed?.id ?? "assistant");

  if (seed) {
    state = {
      ...state,
      message: {
        ...state.message,
        ...seed,
        parts: seed.parts ?? state.message.parts,
      },
    };
  }

  for await (const event of events) {
    state = applyAgentEvent(state, event);
    yield state.message as ChatMessage;
  }
}
