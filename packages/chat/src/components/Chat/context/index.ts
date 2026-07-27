"use client";

import { useMemo, type Dispatch } from "react";
import { useComposer } from "./composer.context";
import { useMessages } from "./messages.context";
import { useModel } from "./model.context";
import { useThread } from "./thread.context";
import type { ProviderId } from "./types";

type CompatAction =
  | { type: "setInput"; data: { input: string } }
  | { type: "setProvider"; data: { provider: ProviderId; model?: string } }
  | { type: "setModel"; data: { model: string } }
  | { type: "addReference"; data: { text: string } }
  | { type: "removeReference"; data: { id: string } }
  | { type: "clearReferences" };

/**
 * Compatibility facade over split contexts.
 * Prefer useComposer / useMessages / useModel / useThread in UI components
 * so typing and streaming do not share one render subscription.
 */
export function useChat() {
  const composer = useComposer();
  const messages = useMessages();
  const model = useModel();
  const thread = useThread();

  return useMemo(() => {
    const dispatch: Dispatch<CompatAction> = (action) => {
      switch (action.type) {
        case "setInput":
          composer.setInput(action.data.input);
          break;
        case "setProvider":
          model.setProvider(action.data.provider, action.data.model);
          break;
        case "setModel":
          model.setModel(action.data.model);
          break;
        case "addReference":
          composer.addReference(action.data.text);
          break;
        case "removeReference":
          composer.removeReference(action.data.id);
          break;
        case "clearReferences":
          composer.clearReferences();
          break;
        default:
          break;
      }
    };

    return {
      state: {
        input: composer.input,
        provider: model.provider,
        model: model.model,
        references: composer.references,
        disabled: composer.disabled,
        sendDisabled: !composer.canSend,
      },
      dispatch,
      messages: messages.messages,
      status: messages.status,
      activeThreadId: thread.activeThreadId,
      threads: thread.threads,
      isLoadingThread: thread.isLoadingThread,
      registry: model.registry,
      sendMessage: messages.sendMessage,
      submitInput: composer.submitInput,
      editAndResendMessage: messages.editAndResendMessage,
      stopResponse: messages.stopResponse,
      selectThread: thread.selectThread,
      createThread: thread.createThread,
      deleteThread: thread.deleteThread,
    };
  }, [composer, messages, model, thread]);
}

export {
  ChatContextProvider,
  type ChatContextProviderProps,
} from "./chat.provider";
export { useComposer } from "./composer.context";
export { useMessages } from "./messages.context";
export { useModel } from "./model.context";
export { useThread } from "./thread.context";
export {
  ProviderId,
  defaultRegistry,
  type ChatReference,
  type RegistryConfig,
  type RegistryModel,
  type RegistryProvider,
  type SendMessage,
} from "./types";
