const serverUrl = (process.env.SYMPHONY_SERVER_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

type AcceptedRun = {
  events_url?: unknown;
};

const errorResponse = async (response: Response) =>
  new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "text/plain; charset=utf-8",
    },
  });

export async function POST(req: Request) {
  try {
    const acceptedResponse = await fetch(`${serverUrl}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await req.text(),
      signal: req.signal,
    });

    if (!acceptedResponse.ok) {
      return errorResponse(acceptedResponse);
    }

    const accepted = (await acceptedResponse.json()) as AcceptedRun;
    if (typeof accepted.events_url !== "string" || !accepted.events_url) {
      return new Response("Symphony did not return an events_url for the accepted run", {
        status: 502,
      });
    }

    const eventsUrl = new URL(accepted.events_url, `${serverUrl}/`);
    if (eventsUrl.origin !== new URL(serverUrl).origin) {
      return new Response("Symphony returned an invalid events_url", { status: 502 });
    }

    const eventResponse = await fetch(eventsUrl, {
      headers: { Accept: "text/event-stream" },
      cache: "no-store",
      signal: req.signal,
    });

    if (!eventResponse.ok) {
      return errorResponse(eventResponse);
    }
    if (!eventResponse.body) {
      return new Response("Symphony event subscription returned no stream", { status: 502 });
    }

    return new Response(eventResponse.body, {
      status: 200,
      headers: {
        "Content-Type": eventResponse.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Symphony server is unavailable";
    return new Response(message, { status: 502 });
  }
}
