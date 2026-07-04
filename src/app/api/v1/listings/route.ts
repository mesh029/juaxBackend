import { prisma } from "@/lib/db";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { isKisumuOnlyListings } from "@/lib/app-settings";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = parseListingTypeFilter(searchParams.get("type"));
  let county = (searchParams.get("county") ?? "kisumu").toLowerCase();
  if (await isKisumuOnlyListings()) county = "kisumu";

  const { limit, offset } = parsePagination(
    searchParams.get("limit"),
    searchParams.get("offset"),
  );

  const rows = await prisma.listing.findMany({
    where: {
      status: "published",
      county,
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
