#!/usr/bin/env node
import { renderChat } from "@sarchauhan/chat-tui";
import { createAiSdkAdapter } from "@sarchauhan/adapter/ai-sdk";
import { createDemoAdapter } from "./demo-adapter.js";

const mode = process.argv.includes("--remote") ? "remote" : "demo";
const baseUrl = process.env.CHAT_API_BASE ?? "http://localhost:3000";

const adapter =
  mode === "remote"
    ? createAiSdkAdapter({
        chatUrl: `${baseUrl}/api/chat`,
        threadsUrl: `${baseUrl}/api/threads`,
      })
    : createDemoAdapter();

const models = [
  { id: "llama3.2", label: "llama3.2", provider: "ollama" },
  { id: "gpt-4o-mini", label: "gpt-4o-mini", provider: "openai" },
  { id: "claude-sonnet-4-5", label: "claude-sonnet-4-5", provider: "anthropic" },
  { id: "gemini-2.0-flash", label: "gemini-2.0-flash", provider: "google" },
];

console.error(
  mode === "remote"
    ? `chat-tui → ${baseUrl} (Ctrl+C to quit)`
    : "chat-tui demo adapter (Ctrl+C to quit)",
);

renderChat({
  adapter,
  models,
  defaultProvider: "ollama",
  defaultModel: "llama3.2",
  mode: "linear",
  alternateScreen: true,
});
