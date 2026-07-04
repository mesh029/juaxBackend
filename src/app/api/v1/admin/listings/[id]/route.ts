import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { adminListingPatchSchema } from "@/lib/listings/admin-schemas";
import { adminListingSelect, toAdminListingDto } from "@/lib/listings/admin-dto";

type Params = { params: { id: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireRole(request, ["admin"]);
    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      select: adminListingSelect,
    });
    if (!listing) {
      return jsonWithCors({ error: "not_found", message: "Listing not found" }, request, {
        status: 404,
      });
    }
    return jsonWithCors({ listing: toAdminListingDto(listing) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireRole(request, ["admin"]);
    const body = adminListingPatchSchema.parse(await request.json());

    const existing = await prisma.listing.findUnique({ where: { id: params.id } });
    if (!existing) {
      return jsonWithCors({ error: "not_found", message: "Listing not found" }, request, {
        status: 404,
      });
    }

    const listing = await prisma.listing.update({
      where: { id: params.id },
      data: {
        ...(body.type !== undefined && { type: body.type }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.neighborhood !== undefined && { neighborhood: body.neighborhood }),
        ...(body.county !== undefined && { county: body.county }),
        ...(body.beds !== undefined && { beds: body.beds }),
        ...(body.baths !== undefined && { baths: body.baths }),
        ...(body.sqm !== undefined && { sqm: body.sqm }),
        ...(body.furnished !== undefined && { furnished: body.furnished }),
        ...(body.amenities !== undefined && { amenities: body.amenities }),
        ...(body.priceKes !== undefined && { priceKes: body.priceKes }),
        ...(body.priceUnit !== undefined && { priceUnit: body.priceUnit }),
        ...(body.cleaningFeeKes !== undefined && { cleaningFeeKes: body.cleaningFeeKes }),
        ...(body.approxLat !== undefined && { approxLat: body.approxLat }),
        ...(body.approxLng !== undefined && { approxLng: body.approxLng }),
        ...(body.exactAddress !== undefined && { exactAddress: body.exactAddress }),
        ...(body.exactLat !== undefined && { exactLat: body.exactLat }),
        ...(body.exactLng !== undefined && { exactLng: body.exactLng }),
        ...(body.hostName !== undefined && { hostName: body.hostName }),
        ...(body.hostPhone !== undefined && { hostPhone: body.hostPhone }),
        ...(body.hostWhatsapp !== undefined && { hostWhatsapp: body.hostWhatsapp }),
        ...(body.vacant !== undefined && { vacant: body.vacant }),
      },
      select: adminListingSelect,
    });

    return jsonWithCors({ listing: toAdminListingDto(listing) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
