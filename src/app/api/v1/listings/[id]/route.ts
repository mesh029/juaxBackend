import { prisma } from "@/lib/db";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { optionalAuth } from "@/lib/auth/require-auth";
import {
  isListingUnlocked,
  toListingResponse,
} from "@/lib/location-gate";
import { buildUnlockContext } from "@/lib/listings/unlock-context";
import { fetchGatedFields } from "@/lib/listings/gated-fields";
import { publicListingSelect, toListingRow } from "@/lib/listings/prisma-mappers";

type Params = { params: { id: string } };

export async function GET(request: Request, { params }: Params) {
  const listing = await prisma.listing.findFirst({
    where: { id: params.id, status: "published" },
    select: publicListingSelect,
  });

  if (!listing) {
    return jsonWithCors({ error: "not_found", message: "Listing not found" }, request, {
      status: 404,
    });
  }

  const row = toListingRow(listing);
  const auth = await optionalAuth(request);
  const ctx = await buildUnlockContext(auth?.user.id ?? null);
  const gated = isListingUnlocked(row, ctx) ? await fetchGatedFields(listing.id) : null;

  return jsonWithCors(toListingResponse(row, ctx, gated), request);
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
