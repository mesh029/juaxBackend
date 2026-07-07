import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toListingRequestDto } from "@/lib/listing-requests/dto";
import { createListingRequestSchema } from "@/lib/listing-requests/schemas";
import { createListingRequest, listUserListingRequests } from "@/lib/listing-requests/service";

export async function GET(request: Request) {
  try {
    const { user } = await requireAuth(request);
    const rows = await listUserListingRequests(user.id);
    return jsonWithCors({ requests: rows.map((r) => toListingRequestDto(r)) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth(request);
    const body = createListingRequestSchema.parse(await request.json());

    const row = await createListingRequest({
      userId: user.id,
      listingId: body.listingId,
      kind: body.kind,
      userNote: body.userNote,
      pickupMode: body.pickupMode,
    });

    if (!row) {
      return jsonWithCors({ error: "not_found", message: "Listing not found or kind mismatch" }, request, {
        status: 404,
      });
    }

    return jsonWithCors({ request: toListingRequestDto(row, { includeMessages: true }) }, request, {
      status: 201,
    });
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
