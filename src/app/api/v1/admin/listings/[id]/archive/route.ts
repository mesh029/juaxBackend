import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { handleRouteError } from "@/lib/api/route-helpers";

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    await requireRole(request, ["admin"]);
    const listing = await prisma.listing.update({
      where: { id: params.id },
      data: { status: "archived" },
    });
    return jsonWithCors({ id: listing.id, status: listing.status }, request);
  } catch (err) {
    return handleRouteError(request, err);
  }
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
