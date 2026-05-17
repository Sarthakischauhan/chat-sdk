import type { UIMessage } from "ai";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
};

const DEFAULT_THREAD_TITLE = "New chat";
const toJsonValue = <T,>(value: T) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const deriveThreadTitle = (messages: UIMessage[]) => {
  const firstUserText = messages
    .find((message) => message.role === "user")
    ?.parts.find((part) => part.type === "text" && part.text.trim()) as
    | { text: string }
    | undefined;

  if (!firstUserText) {
    return DEFAULT_THREAD_TITLE;
  }

  return firstUserText.text.trim().slice(0, 60) || DEFAULT_THREAD_TITLE;
};

const toThread = (thread: {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}): ChatThread => ({
  id: thread.id,
  title: thread.title,
  createdAt: thread.createdAt.toISOString(),
  updatedAt: thread.updatedAt.toISOString(),
});

export const createThread = async () => {
  const thread = await prisma.thread.create({
    data: {
      title: DEFAULT_THREAD_TITLE,
    },
  });

  return toThread(thread);
};

export const listThreads = async () => {
  const threads = await prisma.thread.findMany({
    where: {
      archivedAt: null,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return threads.map(toThread);
};

export const archiveThread = async (threadId: string) => {
  await prisma.thread.update({
    where: {
      id: threadId,
    },
    data: {
      archivedAt: new Date(),
    },
  });
};

export const getThreadMessages = async (threadId: string): Promise<UIMessage[]> => {
  const messages = await prisma.message.findMany({
    where: {
      threadId,
    },
    orderBy: {
      sequence: "asc",
    },
  });

  return messages.map((message) => message.payload as unknown as UIMessage);
};

export const saveThreadMessages = async ({
  threadId,
  messages,
  provider,
  model,
}: {
  threadId: string;
  messages: UIMessage[];
  provider?: string;
  model?: string;
}) => {
  const title = deriveThreadTitle(messages);

  await prisma.$transaction(async (tx) => {
    await tx.thread.upsert({
      where: {
        id: threadId,
      },
      create: {
        id: threadId,
        title,
      },
      update: {
        title,
      },
    });

    await tx.message.deleteMany({
      where: {
        threadId,
      },
    });

    if (messages.length > 0) {
      await tx.message.createMany({
        data: messages.map((message, index) => ({
          id: message.id,
          threadId,
          role: message.role,
          payload: toJsonValue(message),
          provider,
          model,
          sequence: index,
        })),
      });
    }
  });

  const thread = await prisma.thread.findUniqueOrThrow({
    where: {
      id: threadId,
    },
  });

  return toThread(thread);
};

export const ensureThread = async (threadId: string) => {
  const existing = await prisma.thread.findUnique({
    where: {
      id: threadId,
    },
  });

  if (existing) {
    return toThread(existing);
  }

  const thread = await prisma.thread.create({
    data: {
      id: threadId,
      title: DEFAULT_THREAD_TITLE,
    },
  });

  return toThread(thread);
};
