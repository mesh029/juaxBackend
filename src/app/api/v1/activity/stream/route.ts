import { verifyAccessToken } from "@/lib/auth/jwt";
import { getBearerToken } from "@/lib/auth/require-auth";
import { fetchActivitySnapshot } from "@/lib/activity/snapshot";
import { jsonWithCors, optionsResponse, withCors } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Vercel — reconnect client before hard timeout. */
export const maxDuration = 60;

const TICK_MS = 5000;

async function resolveToken(request: Request): Promise<string | null> {
  const fromQuery = new URL(request.url).searchParams.get("token");
  if (fromQuery) return fromQuery;
  return getBearerToken(request);
}

export async function GET(request: Request) {
  const token = await resolveToken(request);
  if (!token) {
    return jsonWithCors({ error: "unauthorized", message: "Missing token" }, request, {
      status: 401,
    });
  }

  let claims;
  try {
    claims = await verifyAccessToken(token);
  } catch {
    return jsonWithCors({ error: "unauthorized", message: "Invalid token" }, request, {
      status: 401,
    });
  }

  const encoder = new TextEncoder();
  let lastDigest = "";
  let closed = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const publish = async () => {
        if (closed) return;
        try {
          const snapshot = await fetchActivitySnapshot(claims.sub, claims.role);
          const digest = JSON.stringify(snapshot);
          if (digest === lastDigest) return;
          lastDigest = digest;
          const payload = JSON.stringify({
            type: "activity_update",
            snapshot,
            at: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // next tick retries
        }
      };

      await publish();
      timer = setInterval(() => {
        void publish();
      }, TICK_MS);

      request.signal.addEventListener("abort", () => {
        closed = true;
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  const origin = request.headers.get("origin");
  const response = new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });

  return withCors(response, origin);
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
