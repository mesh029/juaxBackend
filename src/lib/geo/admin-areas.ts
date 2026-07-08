import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type AdminAreaLevel = "county";

export type ResolvedAdminArea = {
  slug: string;
  name: string;
  level: AdminAreaLevel;
  countryCode: string;
};

function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Point-in-polygon county lookup via PostGIS (requires imported admin_areas rows). */
export async function resolveCountyFromPoint(
  lat: number,
  lng: number,
  countryCode = "KE",
): Promise<ResolvedAdminArea | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const rows = await prisma.$queryRaw<
    { slug: string; name: string; level: string; country_code: string }[]
  >`
    SELECT slug, name, level, country_code
    FROM admin_areas
    WHERE country_code = ${countryCode}
      AND level = 'county'
      AND ST_Contains(
        boundary::geometry,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      )
    ORDER BY ST_Area(boundary::geography) ASC
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;
  return {
    slug: row.slug,
    name: row.name,
    level: row.level as AdminAreaLevel,
    countryCode: row.country_code,
  };
}

export async function hasAdminAreas(countryCode = "KE"): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*)::bigint AS n FROM admin_areas WHERE country_code = ${countryCode}
  `;
  return Number(rows[0]?.n ?? 0) > 0;
}

export type NearbyListingRow = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  neighborhood: string;
  county: string;
  beds: number;
  baths: number;
  sqm: number | null;
  furnished: boolean;
  amenities: string[];
  price_kes: number;
  price_unit: string;
  approx_lat: number;
  approx_lng: number;
  vacant: boolean;
  distance_km: number;
};

type NearbyQueryOpts = {
  lat: number;
  lng: number;
  radiusKm: number;
  countySlug: string | null;
  typeFilter: Prisma.Sql;
  limit: number;
  offset: number;
};

/**
 * PostGIS proximity search — ST_DWithin uses GIST index on listing pins.
 * When countySlug is set, listing pin must fall inside that county polygon.
 */
export async function queryListingsNearby(opts: NearbyQueryOpts): Promise<NearbyListingRow[]> {
  const { lat, lng, radiusKm, countySlug, typeFilter, limit, offset } = opts;
  const radiusM = radiusKm * 1000;
  const userPoint = Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
  const listingPoint = Prisma.sql`ST_SetSRID(ST_MakePoint(approx_lng, approx_lat), 4326)::geography`;

  const countyFilter =
    countySlug != null
      ? Prisma.sql`
          AND EXISTS (
            SELECT 1 FROM admin_areas a
            WHERE a.country_code = 'KE'
              AND a.level = 'county'
              AND a.slug = ${countySlug}
              AND ST_Contains(a.boundary::geometry, ${listingPoint}::geometry)
          )
        `
      : Prisma.sql``;

  return prisma.$queryRaw<NearbyListingRow[]>`
    SELECT id, type, title, description, neighborhood, county,
           beds, baths, sqm, furnished, amenities, price_kes, price_unit,
           approx_lat, approx_lng, vacant,
           ST_Distance(${listingPoint}, ${userPoint}) / 1000.0 AS distance_km
    FROM listings
    WHERE status = 'published'
      ${typeFilter}
      AND ST_DWithin(${listingPoint}, ${userPoint}, ${radiusM})
      ${countyFilter}
    ORDER BY distance_km ASC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

export { normalizeSlug };
