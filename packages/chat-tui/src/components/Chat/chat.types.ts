import type {
  ChatAdapter,
  ChatMessage,
  ChatStatus,
  ChatThread,
  SendMessage,
} from "../../types";

export type FocusPane = "messages" | "threads" | "composer" | "models" | "help";

export type ModelOption = {
  id: string;
  label: string;
  provider: string;
};

export type ChatContextValue = {
  messages: ChatMessage[];
  status: ChatStatus;
  isSending: boolean;
  isLoadingThread: boolean;
  threads: ChatThread[];
  threadId: string | null;
  provider: string;
  model: string;
  models: ModelOption[];
  input: string;
  setInput: (value: string | ((current: string) => string)) => void;
  focus: FocusPane;
  setFocus: (pane: FocusPane) => void;
  showHelp: boolean;
  setShowHelp: (value: boolean | ((current: boolean) => boolean)) => void;
  scrollOffset: number;
  setScrollOffset: (value: number | ((current: number) => number)) => void;
  sendMessage: SendMessage;
  submitInput: () => Promise<void>;
  stopResponse: () => void;
  selectThread: (threadId: string) => Promise<void>;
  createThread: () => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  editAndResendMessage: (messageId: string, text: string) => Promise<void>;
  setProvider: (provider: string, model?: string) => void;
  setModel: (model: string) => void;
  cycleModel: (direction: 1 | -1) => void;
};

export type ChatProviderProps = {
  adapter: ChatAdapter;
  defaultThreadId?: string;
  defaultProvider?: string;
  defaultModel?: string;
  models?: ModelOption[];
  children: React.ReactNode;
};
