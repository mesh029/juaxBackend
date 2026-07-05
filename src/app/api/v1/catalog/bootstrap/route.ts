import { buildAppCatalog } from "@/lib/catalog/bootstrap";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const county = (searchParams.get("county") ?? "kisumu").toLowerCase();
  const payload = await buildAppCatalog(county);
  return jsonWithCors(payload, request);
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
