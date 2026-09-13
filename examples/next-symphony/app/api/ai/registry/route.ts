import type { RegistryConfig } from "@sarchauhan/chat";

const serverUrl = (process.env.SYMPHONY_SERVER_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export async function GET() {
  try {
    const response = await fetch(`${serverUrl}/models`, { cache: "no-store" });
    if (!response.ok) return new Response("Unable to load Symphony models", { status: 502 });

    // Symphony's /models endpoint already returns RegistryConfig. Return it
    // unchanged so qualified IDs and thinking levels are preserved.
    const registry = (await response.json()) as RegistryConfig;
    return Response.json(registry);
  } catch {
    return new Response("Symphony model service is unavailable", { status: 502 });
  }
}
