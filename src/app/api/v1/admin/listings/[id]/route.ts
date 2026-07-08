import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { adminListingPatchSchema } from "@/lib/listings/admin-schemas";
import { adminListingSelect, listingPatchData, toAdminListingDto } from "@/lib/listings/admin-dto";

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
      data: listingPatchData(body),
      select: adminListingSelect,
    });

    return jsonWithCors({ listing: toAdminListingDto(listing) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireRole(request, ["admin"]);
    const existing = await prisma.listing.findUnique({ where: { id: params.id } });
    if (!existing) {
      return jsonWithCors({ error: "not_found", message: "Listing not found" }, request, {
        status: 404,
      });
    }

    await prisma.listing.delete({ where: { id: params.id } });
    return jsonWithCors({ ok: true, id: params.id }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
