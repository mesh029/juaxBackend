import type { AdminListing } from "@/lib/api/types";

type AdminListingRow = {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  neighborhood: string;
  county: string;
  priceKes: number;
  priceUnit: string;
  cleaningFeeKes: number;
  beds: number;
  baths: number;
  sqm: number | null;
  furnished: boolean;
  amenities: string[];
  vacant: boolean;
  approxLat: number;
  approxLng: number;
  exactAddress: string | null;
  exactLat: number | null;
  exactLng: number | null;
  hostName: string | null;
  hostPhone: string | null;
  hostWhatsapp: string | null;
  createdAt: Date;
};

export function toAdminListingDto(row: AdminListingRow): AdminListing {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    title: row.title,
    description: row.description,
    neighborhood: row.neighborhood,
    locationName: row.neighborhood,
    county: row.county,
    priceKes: row.priceKes,
    priceUnit: row.priceUnit,
    cleaningFeeKes: row.cleaningFeeKes,
    beds: row.beds,
    baths: row.baths,
    sqm: row.sqm,
    furnished: row.furnished,
    amenities: row.amenities,
    vacant: row.vacant,
    approxPin: { lat: row.approxLat, lng: row.approxLng },
    exactPin: { lat: row.exactLat ?? 0, lng: row.exactLng ?? 0 },
    exactAddress: row.exactAddress,
    hostName: row.hostName,
    hostPhone: row.hostPhone,
    hostWhatsapp: row.hostWhatsapp,
    createdAt: row.createdAt.toISOString(),
  };
}

export const adminListingSelect = {
  id: true,
  type: true,
  status: true,
  title: true,
  description: true,
  neighborhood: true,
  county: true,
  priceKes: true,
  priceUnit: true,
  cleaningFeeKes: true,
  beds: true,
  baths: true,
  sqm: true,
  furnished: true,
  amenities: true,
  vacant: true,
  approxLat: true,
  approxLng: true,
  exactAddress: true,
  exactLat: true,
  exactLng: true,
  hostName: true,
  hostPhone: true,
  hostWhatsapp: true,
  createdAt: true,
} as const;
