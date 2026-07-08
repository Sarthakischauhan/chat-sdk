import { aiRegistryConfig } from "@/lib/ai/registry";

export async function GET() {
  return Response.json(aiRegistryConfig);
}
