import {
  convertToModelMessages,
  createIdGenerator,
  streamText,
  consumeStream,
  tool,
  stepCountIs,
  jsonSchema,
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

const agentTools = {
  getCurrentTime: tool({
    description: "Get the current date and time in ISO format.",
    inputSchema: jsonSchema<{ timezone?: string }>({
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "Optional IANA timezone, for example America/New_York.",
        },
      },
      additionalProperties: false,
    }),
    execute: async ({ timezone }) => {
      const now = new Date();
      try {
        return {
          iso: now.toISOString(),
          local: timezone
            ? now.toLocaleString("en-US", { timeZone: timezone })
            : now.toLocaleString(),
          timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      } catch {
        return {
          iso: now.toISOString(),
          local: now.toLocaleString(),
          timezone: "UTC",
          warning: `Unknown timezone: ${timezone}`,
        };
      }
    },
  }),
};

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
    tools: agentTools,
    stopWhen: stepCountIs(5),
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
