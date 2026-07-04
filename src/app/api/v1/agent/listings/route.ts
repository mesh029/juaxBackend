import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { listingBodySchema } from "@/lib/listings/admin-schemas";
import {
  adminListingSelect,
  listingCreateData,
  toAdminListingDto,
} from "@/lib/listings/admin-dto";

export async function GET(request: Request) {
  try {
    const { user } = await requireRole(request, ["agent", "admin"]);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const listings = await prisma.listing.findMany({
      where: {
        agentId: user.id,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: adminListingSelect,
    });

    return jsonWithCors({ listings: listings.map(toAdminListingDto) }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireRole(request, ["agent", "admin"]);
    const body = listingBodySchema.parse(await request.json());

    const listing = await prisma.listing.create({
      data: listingCreateData(user.id, { ...body, publish: body.publish ?? false }),
      select: adminListingSelect,
    });

    return jsonWithCors({ listing: toAdminListingDto(listing) }, request, { status: 201 });
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
