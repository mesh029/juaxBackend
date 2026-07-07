import type { listing_request_kind, listing_request_status } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toListingRequestDto } from "@/lib/listing-requests/dto";
import { listAdminListingRequests } from "@/lib/listing-requests/service";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["admin"]);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as listing_request_status | null;
    const kind = searchParams.get("kind") as listing_request_kind | null;

    const rows = await listAdminListingRequests({
      status: status || undefined,
      kind: kind || undefined,
    });

    return jsonWithCors(
      {
        requests: rows.map((r) => toListingRequestDto(r, { includeMessages: true })),
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
