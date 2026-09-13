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
  /** Known `ProviderId` values or a Symphony / custom registry id. */
  id: string;
  name?: string;
  label: string;
  logo?: string;
  defaultModel: string;
  models: RegistryModel[];
};

export type RegistryConfig = {
  defaultProviderId: string;
  providers: RegistryProvider[];
};

const PROVIDER_IDS: ReadonlySet<string> = new Set(Object.values(ProviderId));

export const isProviderId = (value: unknown): value is ProviderId =>
  typeof value === "string" && PROVIDER_IDS.has(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isRegistryModel = (value: unknown): value is RegistryModel => {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.label !== "string") {
    return false;
  }

  if (value.description !== undefined && typeof value.description !== "string") {
    return false;
  }

  if (
    value.thinkingLevels !== undefined &&
    (!Array.isArray(value.thinkingLevels) ||
      !value.thinkingLevels.every((level) => typeof level === "string"))
  ) {
    return false;
  }

  return true;
};

const isRegistryProvider = (value: unknown): value is RegistryProvider =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.label === "string" &&
  typeof value.defaultModel === "string" &&
  Array.isArray(value.models) &&
  value.models.every(isRegistryModel) &&
  (value.name === undefined || typeof value.name === "string") &&
  (value.logo === undefined || typeof value.logo === "string");

export const parseRegistryConfig = (value: unknown): RegistryConfig | undefined => {
  if (!isRecord(value) || typeof value.defaultProviderId !== "string" || !Array.isArray(value.providers)) {
    return undefined;
  }

  const providers = value.providers.filter(isRegistryProvider);
  if (providers.length === 0) {
    return undefined;
  }

  return {
    defaultProviderId: value.defaultProviderId,
    providers,
  };
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
