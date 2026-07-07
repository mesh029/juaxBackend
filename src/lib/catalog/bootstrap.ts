import { prisma } from "@/lib/db";
import { PILOT_LISTING_COUNTIES, resolveListingsCounty } from "@/lib/listings/resolve-county";
import { isKisumuOnlyListings } from "@/lib/app-settings";
import { toPublicListing } from "@/lib/location-gate";
import { publicListingSelect, toListingRow } from "@/lib/listings/prisma-mappers";
import { MAMA_FUA_DISPATCH_FEE_KES } from "@/lib/laundry/pricing";
import { MAMA_FUA_TASKS } from "@/lib/laundry/mamafua-tasks";
import { listMamaFuaConvenienceBands } from "@/lib/laundry/convenience-times";
import { toLaundryStationDto } from "@/lib/laundry/station-dto";
import { getSubscriptionPlans } from "@/lib/subscription-plans";
import type { AppCatalogBootstrap, PublicListing } from "@/lib/api/types";
import type { Prisma } from "@prisma/client";

function listingsCountyWhere(
  countyInput: string,
  kisumuOnly: boolean,
): Prisma.ListingWhereInput {
  const normalized = (countyInput ?? "kisumu").trim().toLowerCase();
  if (normalized === "pilot" || normalized === "all") {
    if (kisumuOnly) return { county: "kisumu" };
    return { county: { in: [...PILOT_LISTING_COUNTIES] } };
  }
  return { county: normalized };
}

/**
 * Public catalog payload for app cold start — one HTTP round-trip, one serverless
 * invocation, one DB connection. Prefer this over fan-out from mobile/web clients.
 *
 * Query `county=pilot` (or `all`) returns published listings across pilot counties.
 */
export async function buildAppCatalog(countyInput: string): Promise<AppCatalogBootstrap> {
  const kisumuOnly = await isKisumuOnlyListings();
  const normalized = (countyInput ?? "kisumu").trim().toLowerCase();
  const isPilotScope = normalized === "pilot" || normalized === "all";
  const county = isPilotScope
    ? kisumuOnly
      ? "kisumu"
      : "pilot"
    : await resolveListingsCounty(countyInput);
  const countyWhere: Prisma.ListingWhereInput = isPilotScope
    ? listingsCountyWhere(countyInput, kisumuOnly)
    : { county };
  const listingTake = isPilotScope && !kisumuOnly ? 250 : 100;

  const [rentalRows, bnbRows, stations] = await Promise.all([
    prisma.listing.findMany({
      where: { status: "published", ...countyWhere, type: "rental", vacant: true },
      select: publicListingSelect,
      orderBy: { createdAt: "desc" },
      take: listingTake,
    }),
    prisma.listing.findMany({
      where: { status: "published", ...countyWhere, type: "bnb" },
      select: publicListingSelect,
      orderBy: { createdAt: "desc" },
      take: listingTake,
    }),
    prisma.laundryStation.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        county: true,
        lat: true,
        lng: true,
      },
    }),
  ]);

  return {
    county,
    kisumuOnly,
    listings: {
      rental: rentalRows.map((r) => toPublicListing(toListingRow(r))) as PublicListing[],
      bnb: bnbRows.map((r) => toPublicListing(toListingRow(r))) as PublicListing[],
    },
    laundryStations: stations.map(toLaundryStationDto),
    mamaFua: {
      dispatchFeeKes: MAMA_FUA_DISPATCH_FEE_KES,
      description:
        "A rider delivers a Mama Fua with full cleaning equipment. Pick the tasks you need done on-site.",
      tasks: [...MAMA_FUA_TASKS],
      convenienceTimes: listMamaFuaConvenienceBands(),
    },
    subscriptionPlans: getSubscriptionPlans(),
  };
}
