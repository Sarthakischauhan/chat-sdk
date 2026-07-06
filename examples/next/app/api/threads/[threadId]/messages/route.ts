import { getThreadMessages } from "@/lib/db/chat";

type RouteContext = {
  params: Promise<{
    threadId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { threadId } = await context.params;
  const messages = await getThreadMessages(threadId);
  return Response.json({ messages });
}
