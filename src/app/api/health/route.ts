import { checkDbConnection } from "@/lib/db";
import { jsonWithCors } from "@/lib/cors";

export async function GET(request: Request) {
  try {
    await checkDbConnection();
    return jsonWithCors({ status: "ok", db: "connected" }, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonWithCors({ status: "error", message }, request, { status: 503 });
  }
}

export async function OPTIONS(request: Request) {
  const { optionsResponse } = await import("@/lib/cors");
  return optionsResponse(request);
}
