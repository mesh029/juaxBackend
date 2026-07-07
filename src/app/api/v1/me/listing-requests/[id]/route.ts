import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toListingRequestDto } from "@/lib/listing-requests/dto";
import { getUserListingRequest } from "@/lib/listing-requests/service";

type Params = { params: { id: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuth(request);
    const row = await getUserListingRequest(user.id, params.id);
    if (!row) {
      return jsonWithCors({ error: "not_found", message: "Request not found" }, request, { status: 404 });
    }
    return jsonWithCors({ request: toListingRequestDto(row, { includeMessages: true }) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
