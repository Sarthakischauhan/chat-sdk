import {
  convertToModelMessages,
  createIdGenerator,
  streamText,
  consumeStream,
  type UIMessage,
} from "ai";
import { registry } from "@/lib/ai/registry";
import { ensureThread, getThreadMessages, saveThreadMessages } from "@/lib/db/chat";

type ProviderId = "openai" | "anthropic" | "google" | "ollama";
const Providers: ProviderId[] = [
  "anthropic",
  "ollama",
  "openai",
  "google"
];

const DEFAULT_MODELS: Record<ProviderId, string> = {
  openai: "gpt-4.1",
  anthropic: "claude-3-7-sonnet-20250219",
  google: "gemini-2.5-flash",
  ollama: "smallthinker:latest",
};

export async function POST(req: Request) {
  const {
    id,
    message,
    provider = "openai",
    model,
  }: {
    id?: string;
    message?: UIMessage;
    provider?: ProviderId;
    model?: string;
  } = await req.json();

  if (!Providers.includes(provider)) {
    return new Response("Unsupported provider", { status: 400 });
  }

  if (!id || !message) {
    return new Response("Missing thread or message", { status: 400 });
  }

  await ensureThread(id);
  const messages = [...(await getThreadMessages(id)), message];
  const modelId = model ?? DEFAULT_MODELS[provider];
  const result = streamText({
    model: registry.languageModel(`${provider}:${modelId}`),
    messages: await convertToModelMessages(messages),
    providerOptions: {
      ollama: {
        think: false,
      },
    },
  });

  result.consumeStream();

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({
      prefix: "msg",
      size: 16,
    }),
    onFinish: async ({ messages: responseMessages }) => {
      await saveThreadMessages({
        threadId: id,
        messages: responseMessages,
        provider,
        model: modelId,
      });
    },
    consumeSseStream: consumeStream,
  });
}
