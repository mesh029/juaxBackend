import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import {
  hasAdminAreas,
  queryListingsNearby,
  resolveCountyFromPoint,
} from "@/lib/geo/admin-areas";
import { getDefaultSearchRadiusKm } from "@/lib/app-settings";
import { isPilotListingCounty, resolveListingsCounty } from "@/lib/listings/resolve-county";
import { toPublicListing, type ListingPublicRow } from "@/lib/location-gate";
import {
  parseListingTypeFilter,
  parsePagination,
} from "@/lib/listings/filters";

function typeSqlFilter(type: ReturnType<typeof parseListingTypeFilter>): Prisma.Sql {
  if (type === "rental") return Prisma.sql`AND type = 'rental' AND vacant = TRUE`;
  if (type === "bnb") return Prisma.sql`AND type = 'bnb'`;
  return Prisma.sql``;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");

  if (latParam === null || lngParam === null || latParam === "" || lngParam === "") {
    return jsonWithCors(
      { error: "validation_error", message: "lat and lng query params are required" },
      request,
      { status: 400 },
    );
  }

  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return jsonWithCors(
      { error: "validation_error", message: "lat and lng must be valid numbers" },
      request,
      { status: 400 },
    );
  }

  const type = parseListingTypeFilter(searchParams.get("type"));

  const radiusParam = searchParams.get("radiusKm");
  const radiusKm = radiusParam
    ? Number(radiusParam)
    : await getDefaultSearchRadiusKm();
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    return jsonWithCors(
      { error: "validation_error", message: "radiusKm must be a positive number" },
      request,
      { status: 400 },
    );
  }

  const { limit, offset } = parsePagination(
    searchParams.get("limit"),
    searchParams.get("offset"),
  );

  const requestedCounty = searchParams.get("county");
  let countySlug: string | null = null;
  let countySource: "request" | "gps" | "fallback" = "fallback";

  if (requestedCounty && isPilotListingCounty(requestedCounty)) {
    countySlug = requestedCounty.toLowerCase();
    countySource = "request";
  } else if (await hasAdminAreas()) {
    const detected = await resolveCountyFromPoint(lat, lng);
    if (detected) {
      countySlug = detected.slug;
      countySource = "gps";
    }
  }

  if (!countySlug) {
    countySlug = await resolveListingsCounty(requestedCounty);
    countySource = "fallback";
  }

  const usePostGis = await hasAdminAreas();
  let rows: (ListingPublicRow & { distance_km: number })[];

  if (usePostGis) {
    const postgisRows = await queryListingsNearby({
      lat,
      lng,
      radiusKm,
      countySlug,
      typeFilter: typeSqlFilter(type),
      limit,
      offset,
    });
    rows = postgisRows.map((row) => ({
      ...row,
      price_kes: row.price_kes,
      distance_km: row.distance_km,
    })) as (ListingPublicRow & { distance_km: number })[];
  } else {
    const distanceExpr = Prisma.sql`
      (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${lat})) * cos(radians(approx_lat))
            * cos(radians(approx_lng) - radians(${lng}))
            + sin(radians(${lat})) * sin(radians(approx_lat))
          ))
        )
      )
    `;
    rows = await prisma.$queryRaw<(ListingPublicRow & { distance_km: number })[]>`
      SELECT id, type, title, description, neighborhood, county,
             beds, baths, sqm, furnished, amenities, price_kes, price_unit,
             approx_lat, approx_lng, vacant,
             ${distanceExpr} AS distance_km
      FROM listings
      WHERE status = 'published'
        AND county = ${countySlug}
        ${typeSqlFilter(type)}
        AND ${distanceExpr} <= ${radiusKm}
      ORDER BY distance_km ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  return jsonWithCors(
    {
      radiusKm,
      center: { lat, lng },
      county: countySlug,
      countySource,
      listings: rows.map((row) => toPublicListing(row, row.distance_km)),
    },
    request,
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
