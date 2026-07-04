import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";
import { adminListingBodySchema } from "@/lib/listings/admin-schemas";
import { adminListingSelect, toAdminListingDto } from "@/lib/listings/admin-dto";

async function resolveAgentId(agentId?: string) {
  if (agentId) {
    const agent = await prisma.user.findFirst({
      where: { id: agentId, role: { in: ["agent", "admin"] } },
    });
    if (!agent) throw new Error("invalid_agent");
    return agent.id;
  }
  const fallback = await prisma.user.findFirst({
    where: { role: "agent", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!fallback) throw new Error("no_agent");
  return fallback.id;
}

export async function GET(request: Request) {
  try {
    await requireRole(request, ["admin"]);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const listings = await prisma.listing.findMany({
      where: status ? { status: status as never } : undefined,
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
    await requireRole(request, ["admin"]);
    const body = adminListingBodySchema.parse(await request.json());
    const agentId = await resolveAgentId(body.agentId);

    const listing = await prisma.listing.create({
      data: {
        agentId,
        type: body.type,
        status: body.publish ? "published" : "draft",
        title: body.title,
        description: body.description,
        neighborhood: body.neighborhood,
        county: body.county,
        beds: body.beds,
        baths: body.baths,
        sqm: body.sqm,
        furnished: body.furnished,
        amenities: body.amenities,
        priceKes: body.priceKes,
        priceUnit: body.priceUnit,
        cleaningFeeKes: body.cleaningFeeKes,
        approxLat: body.approxLat,
        approxLng: body.approxLng,
        exactAddress: body.exactAddress,
        exactLat: body.exactLat,
        exactLng: body.exactLng,
        hostName: body.hostName,
        hostPhone: body.hostPhone,
        hostWhatsapp: body.hostWhatsapp,
        vacant: body.vacant,
      },
      select: adminListingSelect,
    });

    return jsonWithCors({ listing: toAdminListingDto(listing) }, request, { status: 201 });
  } catch (err) {
    if (err instanceof Error && (err.message === "invalid_agent" || err.message === "no_agent")) {
      return jsonWithCors(
        { error: "invalid_agent", message: "No valid agent account found" },
        request,
        { status: 400 },
      );
    }
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
