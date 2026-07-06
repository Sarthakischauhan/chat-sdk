import { editThreadMessage } from "@/lib/db/chat";

type RouteContext = {
  params: Promise<{
    threadId: string;
    messageId: string;
  }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const { threadId, messageId } = await context.params;
  const { text }: { text?: string } = await req.json();

  if (!text?.trim()) {
    return new Response("Missing text", { status: 400 });
  }

  try {
    const messages = await editThreadMessage({
      threadId,
      messageId,
      text: text.trim(),
    });

    return Response.json({ messages });
  } catch {
    return new Response("Message not found", { status: 404 });
  }
}
