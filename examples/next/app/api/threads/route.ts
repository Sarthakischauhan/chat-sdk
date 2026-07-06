import { createThread, listThreads } from "@/lib/db/chat";

export async function GET() {
  const threads = await listThreads();
  return Response.json({ threads });
}

export async function POST() {
  const thread = await createThread();
  return Response.json({ thread }, { status: 201 });
}
