export { Chat } from "./components/Chat";
export { ChatComposer } from "./components/Chat/chat";
export {
  ChatContextProvider,
  ProviderId,
  useChat,
  type ChatReference,
  type SendMessage,
} from "./components/Chat/chat.context";
export type {
  RegistryConfig,
  RegistryModel,
  RegistryProvider,
} from "./components/Chat/chat.context";
export { Message } from "./components/Message/message";
export { BaseWidget, type BaseWidgetProps } from "./components/Widget/base.widget";
export {
  useWidgets,
  WidgetProvider,
  createWidgetRegistry,
  defineWidget,
  type ChatWidgetDefinition,
  type ChatWidgetComponent,
  type ChatWidgetEntry,
  type ChatWidgetInput,
  type ChatWidgetProps,
  type ChatWidgetRegistry,
  type DefineWidgetOptions,
  type WidgetComponentProps,
  type WidgetControls,
  type WidgetResponse,
} from "./components/Widget/widget.context";
export { WidgetRenderer } from "./components/Widget/widget.renderer";
export type {
  ChatAdapter,
  ChatMessage,
  ChatMessagePart,
  ChatRole,
  ChatStatus,
  ChatThread,
  EditMessageInput,
  SendMessageInput,
} from "./types";
export type {
  AgentEvent,
  AgentMessage,
  AgentPart,
  AgentToolPart,
  AgentWidgetPart,
} from "@sarchauhan/protocol";
export {
  applyAgentEvent,
  createAgentMessageState,
  createWidgetData,
  normalizeAgentMessage,
  normalizeAgentParts,
  reduceAgentEvents,
} from "@sarchauhan/protocol";
