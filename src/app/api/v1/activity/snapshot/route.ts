import { verifyAccessToken } from "@/lib/auth/jwt";
import { getBearerToken } from "@/lib/auth/require-auth";
import { fetchActivitySnapshot } from "@/lib/activity/snapshot";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const snapshot = await fetchActivitySnapshot(claims.sub, claims.role);
  return jsonWithCors({ snapshot, at: new Date().toISOString() }, request);
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
