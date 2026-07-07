import type { listing_request_status } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import {
  toListingRequestDto,
  toListingRequestMessageDto,
} from "@/lib/listing-requests/dto";
import { listingRequestMessageSchema } from "@/lib/listing-requests/schemas";
import {
  addListingRequestMessage,
  getAdminListingRequest,
} from "@/lib/listing-requests/service";

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    const { user } = await requireRole(request, ["admin"]);
    const body = listingRequestMessageSchema.parse(await request.json());

    const existing = await getAdminListingRequest(params.id);
    if (!existing) {
      return jsonWithCors({ error: "not_found", message: "Request not found" }, request, { status: 404 });
    }

    let advanceStatus: listing_request_status | undefined;
    if (existing.status === "requested") {
      advanceStatus = "agent_contacted";
    }

    const message = await addListingRequestMessage({
      requestId: params.id,
      senderRole: "admin",
      body: body.body,
      createdBy: user.id,
      advanceStatus,
    });

    const refreshed = await getAdminListingRequest(params.id);

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
