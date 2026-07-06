import { createProviderRegistry } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createOllama } from "ollama-ai-provider-v2"

// create ollama provider
const ollama = createOllama({
  baseURL: "http://localhost:11434/api"
})

export const registry = createProviderRegistry({
  openai,
  anthropic,
  google,
  ollama,
});