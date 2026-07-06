import { archiveThread } from "@/lib/db/chat";

type RouteContext = {
  params: Promise<{
    threadId: string;
  }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  const { threadId } = await context.params;
  await archiveThread(threadId);

  return new Response(null, { status: 204 });
}
