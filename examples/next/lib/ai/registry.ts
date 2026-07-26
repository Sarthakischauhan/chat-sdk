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
  defaultProviderId: "anthropic",
  providers: [
    {
      id: "openai",
      label: "OpenAI",
      logo: "https://www.svgrepo.com/show/306500/openai.svg",
      defaultModel: "gpt-5.6-terra",
      models: [
        { id: "gpt-5.6-sol", label: "GPT-5.6 Sol (Frontier)" },
        { id: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
        { id: "gpt-5.5-pro", label: "GPT-5.5 Pro" },
        { id: "gpt-5.4-mini", label: "GPT-5.4 mini" },
        { id: "gpt-oss-120b", label: "GPT-OSS 120B (Open-Weight)" }
      ],
    },
    {
      id: "anthropic",
      label: "Anthropic",
      logo: "https://cdn.worldvectorlogo.com/logos/anthropic-1.svg",
      defaultModel: "claude-5-sonnet-202606",
      models: [
        { id: "claude-5-fable-202606", label: "Claude Fable 5" },
        { id: "claude-4-8-opus-202606", label: "Claude Opus 4.8" },
        { id: "claude-5-sonnet-202606", label: "Claude Sonnet 5" },
        { id: "claude-4-5-haiku-202510", label: "Claude Haiku 4.5" }
      ],
    },
    {
      id: "google",
      label: "Google",
      logo: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Google-gemini-icon.svg",
      defaultModel: "gemini-3.6-flash",
      models: [
        { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
        { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
        { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
        { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)" }
      ],
    },
    {
      id: "ollama",
      label: "Ollama",
      logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-avatar/avatars/ollama.webp",
      defaultModel: "qwen3-coder:30b",
      models: [
        { id: "qwen3-coder:30b", label: "Qwen 3 Coder (30B)" },
        { id: "devstral:24b", label: "Devstral (24B)" },
        { id: "deepseek-r1:32b", label: "DeepSeek R1 (32B)" },
        { id: "gpt-oss:20b", label: "GPT-OSS (20B)" },
        { id: "llama3.3:70b", label: "Llama 3.3 (70B)" },
        { id: "smallthinker:latest", label: "SmallThinker" }
      ],
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