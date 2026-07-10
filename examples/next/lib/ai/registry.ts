import { createProviderRegistry } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider-v2"

export type ProviderId = "openai" | "anthropic" | "google" | "ollama";

export type RegistryModel = {
  id: string;
  label: string;
};

export type RegistryProvider = {
  id: ProviderId;
  label: string;
  logo: string;
  defaultModel: string;
  models: RegistryModel[];
};

export type RegistryConfig = {
  defaultProviderId: ProviderId;
  providers: RegistryProvider[];
};

export const aiRegistryConfig = {
  defaultProviderId: "ollama",
  providers: [
    {
      id: "openai",
      label: "OpenAI",
      logo: "https://www.svgrepo.com/show/306500/openai.svg",
      defaultModel: "gpt-4.1",
      models: [{ id: "gpt-4.1", label: "GPT-4.1" }],
    },
    {
      id: "anthropic",
      label: "Anthropic",
      defaultModel: "claude-3-7-sonnet-20250219",
      logo: "https://cdn.worldvectorlogo.com/logos/anthropic-1.svg",
      models: [{ id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet" }],
    },
    {
      id: "google",
      label: "Google",
      defaultModel: "gemini-2.5-flash",
      logo: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Google-gemini-icon.svg",
      models: [{ id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }],
    },
    {
      id: "ollama",
      label: "Ollama",
      defaultModel: "smallthinker:latest",
      logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-avatar/avatars/ollama.webp",
      models: [{ id: "smallthinker:latest", label: "smallthinker:latest" }],
    },
  ],
} satisfies RegistryConfig;

export const getProviderConfig = (providerId: ProviderId) =>
  aiRegistryConfig.providers.find((provider) => provider.id === providerId);

// create ollama provider
const ollama = createOllama({
  baseURL: "http://localhost:11434/api",
});

export const registry = createProviderRegistry({
  openai,
  anthropic,
  google,
  ollama,
});
