import { requireAuth } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { toListingRequestDto, toListingRequestMessageDto } from "@/lib/listing-requests/dto";
import { listingRequestMessageSchema } from "@/lib/listing-requests/schemas";
import {
  addListingRequestMessage,
  getUserListingRequest,
} from "@/lib/listing-requests/service";

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    const { user } = await requireAuth(request);
    const body = listingRequestMessageSchema.parse(await request.json());

    const existing = await getUserListingRequest(user.id, params.id);
    if (!existing) {
      return jsonWithCors({ error: "not_found", message: "Request not found" }, request, { status: 404 });
    }
    if (existing.status === "viewing_completed" || existing.status === "cancelled") {
      return jsonWithCors({ error: "closed", message: "This request is closed" }, request, { status: 400 });
    }

    const message = await addListingRequestMessage({
      requestId: params.id,
      senderRole: "user",
      body: body.body,
      createdBy: user.id,
    });

    const refreshed = await getUserListingRequest(user.id, params.id);

    return jsonWithCors(
      {
        message: toListingRequestMessageDto(message),
        request: refreshed ? toListingRequestDto(refreshed, { includeMessages: true }) : null,
      },
      request,
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
