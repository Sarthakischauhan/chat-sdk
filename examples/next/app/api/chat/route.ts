import {
  convertToModelMessages,
  createIdGenerator,
  streamText,
  consumeStream,
  type UIMessage,
} from "ai";
import {
  aiRegistryConfig,
  getProviderConfig,
  registry,
  type ProviderId,
} from "@/lib/ai/registry";
import { ensureThread, getThreadMessages, saveThreadMessages } from "@/lib/db/chat";

const Providers = aiRegistryConfig.providers.map((provider) => provider.id);

export async function POST(req: Request) {
  const {
    id,
    message,
    provider = aiRegistryConfig.defaultProviderId,
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
  const providerConfig = getProviderConfig(provider);

  if (!providerConfig) {
    return new Response("Unsupported provider", { status: 400 });
  }

  const modelId =
    providerConfig.models.find((entry) => entry.id === model)?.id ?? providerConfig.defaultModel;
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
