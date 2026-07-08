import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { resolveCountyFromPoint } from "@/lib/geo/admin-areas";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return jsonWithCors(
        { error: "validation_error", message: "lat and lng are required" },
        request,
        { status: 400 },
      );
    }

    const area = await resolveCountyFromPoint(lat, lng);
    if (!area) {
      return jsonWithCors({ area: null }, request);
    }

    return jsonWithCors(
      {
        area: {
          slug: area.slug,
          name: area.name,
          level: area.level,
          countryCode: area.countryCode,
        },
      },
      request,
    );
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
