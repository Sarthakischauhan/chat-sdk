import type { ChatAdapter, ChatMessage, ChatStatus, ChatThread } from "../../../types";

export enum ProviderId {
  SYMPHONY = "symphony",
  MOCK = "mock",
  OPENAI = "openai",
  GOOGLE = "google",
  GEMINI = "gemini",
  CLAUDE = "anthropic",
  GROK = "grok",
  OLLAMA = "ollama",
  LOCAL = "local",
}

export type RegistryModel = {
  id: string;
  label: string;
  description?: string;
  thinkingLevels?: string[];
};

export type RegistryProvider = {
  id: ProviderId;
  name?: string;
  label: string;
  logo?: string;
  defaultModel: string;
  models: RegistryModel[];
};

export type RegistryConfig = {
  defaultProviderId: ProviderId;
  providers: RegistryProvider[];
};

export type ChatReference = {
  id: string;
  text: string;
};

export type SendMessage = (
  message: { text: string },
  options?: { body?: { provider?: string; model?: string } },
) => Promise<void>;

export type { ChatAdapter, ChatMessage, ChatStatus, ChatThread };

export const defaultRegistry: RegistryConfig = {
  defaultProviderId: ProviderId.MOCK,
  providers: [
    {
      id: ProviderId.SYMPHONY,
      label: "Symphony (custom harness)",
      defaultModel: "",
      models: [],
    },
    {
      id: ProviderId.MOCK,
      label: "Mock",
      defaultModel: "canned",
      models: [{ id: "canned", label: "Canned replies" }],
    },
    {
      id: ProviderId.OPENAI,
      label: "OpenAI",
      defaultModel: "gpt-4.1",
      models: [{ id: "gpt-4.1", label: "GPT-4.1" }],
    },
    {
      id: ProviderId.CLAUDE,
      label: "Anthropic",
      defaultModel: "claude-3-7-sonnet-20250219",
      models: [{ id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet" }],
    },
    {
      id: ProviderId.GOOGLE,
      label: "Google",
      defaultModel: "gemini-2.5-flash",
      models: [{ id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }],
    },
    {
      id: ProviderId.OLLAMA,
      label: "Ollama",
      defaultModel: "smallthinker:latest",
      models: [{ id: "smallthinker:latest", label: "smallthinker:latest" }],
    },
  ],
};
