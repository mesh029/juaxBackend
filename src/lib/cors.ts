import { NextResponse } from "next/server";

function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? "http://localhost:8081")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function resolveOrigin(requestOrigin: string | null): string {
  const allowed = allowedOrigins();
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }
  return allowed[0] ?? "*";
}

export function withCors<T extends Response>(response: T, origin: string | null): T {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", resolveOrigin(origin));
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  }) as T;
}

export function jsonWithCors(
  data: unknown,
  request: Request,
  init?: ResponseInit,
): NextResponse {
  const response = NextResponse.json(data, init);
  return withCors(response, request.headers.get("origin")) as NextResponse;
}

export function optionsResponse(request: Request): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }), request.headers.get("origin"));
}
