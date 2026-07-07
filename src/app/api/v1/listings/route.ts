import { prisma } from "@/lib/db";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { PILOT_LISTING_COUNTIES, resolveListingsCounty } from "@/lib/listings/resolve-county";
import { toPublicListing } from "@/lib/location-gate";
import { publicListingSelect, toListingRow } from "@/lib/listings/prisma-mappers";
import {
  parseListingTypeFilter,
  parsePagination,
} from "@/lib/listings/filters";
import type { listing_type } from "@prisma/client";

function prismaTypeFilter(type: ReturnType<typeof parseListingTypeFilter>) {
  if (type === "rental") return { type: "rental" as listing_type, vacant: true };
  if (type === "bnb") return { type: "bnb" as listing_type };
  return {};
}

async function resolveCountyFilter(requested: string | null) {
  const normalized = (requested ?? "kisumu").trim().toLowerCase();
  if (normalized === "pilot" || normalized === "all") {
    return { county: { in: [...PILOT_LISTING_COUNTIES] } };
  }
  return { county: await resolveListingsCounty(requested) };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = parseListingTypeFilter(searchParams.get("type"));
  const countyFilter = await resolveCountyFilter(searchParams.get("county"));

  const { limit, offset } = parsePagination(
    searchParams.get("limit"),
    searchParams.get("offset"),
  );

  const rows = await prisma.listing.findMany({
    where: {
      status: "published",
      ...countyFilter,
      ...prismaTypeFilter(type),
    },
    select: publicListingSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return jsonWithCors(rows.map((r) => toPublicListing(toListingRow(r))), request);
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
