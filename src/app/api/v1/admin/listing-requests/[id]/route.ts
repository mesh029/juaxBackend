import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toListingRequestDto } from "@/lib/listing-requests/dto";
import { adminUpdateListingRequestSchema } from "@/lib/listing-requests/schemas";
import { getAdminListingRequest, updateListingRequest } from "@/lib/listing-requests/service";

type Params = { params: { id: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireRole(request, ["admin"]);
    const row = await getAdminListingRequest(params.id);
    if (!row) {
      return jsonWithCors({ error: "not_found", message: "Request not found" }, request, { status: 404 });
    }
    return jsonWithCors({ request: toListingRequestDto(row, { includeMessages: true }) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireRole(request, ["admin"]);
    const body = adminUpdateListingRequestSchema.parse(await request.json());

    const existing = await getAdminListingRequest(params.id);
    if (!existing) {
      return jsonWithCors({ error: "not_found", message: "Request not found" }, request, { status: 404 });
    }

    const row = await updateListingRequest(params.id, {
      status: body.status,
      riderName: body.riderName,
      riderPhone: body.riderPhone,
      scheduledAt:
        body.scheduledAt === undefined
          ? undefined
          : body.scheduledAt
            ? new Date(body.scheduledAt)
            : null,
    });

    return jsonWithCors({ request: toListingRequestDto(row, { includeMessages: true }) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
