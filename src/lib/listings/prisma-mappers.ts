import type { ListingPublicRow } from "@/lib/location-gate";

export const publicListingSelect = {
  id: true,
  type: true,
  title: true,
  description: true,
  neighborhood: true,
  county: true,
  beds: true,
  baths: true,
  sqm: true,
  furnished: true,
  amenities: true,
  priceKes: true,
  priceUnit: true,
  coverImageUrl: true,
  imageUrls: true,
  approxLat: true,
  approxLng: true,
  vacant: true,
} as const;

export function toListingRow(row: {
  id: string;
  type: "bnb" | "rental";
  title: string;
  description: string | null;
  neighborhood: string;
  county: string;
  beds: number;
  baths: number;
  sqm: number | null;
  furnished: boolean;
  amenities: string[];
  coverImageUrl: string | null;
  imageUrls: string[];
  priceKes: number;
  priceUnit: string;
  approxLat: number;
  approxLng: number;
  vacant: boolean;
}): ListingPublicRow {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    neighborhood: row.neighborhood,
    county: row.county,
    beds: row.beds,
    baths: row.baths,
    sqm: row.sqm,
    furnished: row.furnished,
    amenities: row.amenities,
    cover_image_url: row.coverImageUrl,
    image_urls: row.imageUrls,
    price_kes: row.priceKes,
    price_unit: row.priceUnit,
    approx_lat: row.approxLat,
    approx_lng: row.approxLng,
    vacant: row.vacant,
  };
}

export function toListingRowFromRaw(row: ListingPublicRow & { distance_km?: number }) {
  return row;
}
