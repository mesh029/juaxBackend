import type { AdminListing } from "@/lib/api/types";
import type { listingBodySchema } from "@/lib/listings/admin-schemas";
import type { z } from "zod";

export type ListingBody = z.infer<typeof listingBodySchema>;

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
  coverImageUrl: string | null;
  imageUrls: string[];
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
    coverImageUrl: row.coverImageUrl,
    imageUrls: row.imageUrls,
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
  coverImageUrl: true,
  imageUrls: true,
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

export function listingCreateData(agentId: string, body: ListingBody) {
  return {
    agentId,
    type: body.type,
    status: body.publish ? ("published" as const) : ("draft" as const),
    title: body.title,
    description: body.description,
    neighborhood: body.neighborhood,
    county: body.county,
    beds: body.beds,
    baths: body.baths,
    sqm: body.sqm,
    furnished: body.furnished,
    amenities: body.amenities,
    coverImageUrl: body.coverImageUrl ?? body.imageUrls[0] ?? null,
    imageUrls: body.imageUrls,
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
  };
}

export function listingPatchData(body: Partial<ListingBody>) {
  return {
    ...(body.type !== undefined && { type: body.type }),
    ...(body.title !== undefined && { title: body.title }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.neighborhood !== undefined && { neighborhood: body.neighborhood }),
    ...(body.county !== undefined && { county: body.county }),
    ...(body.beds !== undefined && { beds: body.beds }),
    ...(body.baths !== undefined && { baths: body.baths }),
    ...(body.sqm !== undefined && { sqm: body.sqm }),
    ...(body.furnished !== undefined && { furnished: body.furnished }),
    ...(body.amenities !== undefined && { amenities: body.amenities }),
    ...(body.coverImageUrl !== undefined && { coverImageUrl: body.coverImageUrl }),
    ...(body.imageUrls !== undefined && {
      imageUrls: body.imageUrls,
      ...(body.coverImageUrl === undefined && body.imageUrls[0]
        ? { coverImageUrl: body.imageUrls[0] }
        : {}),
    }),
    ...(body.priceKes !== undefined && { priceKes: body.priceKes }),
    ...(body.priceUnit !== undefined && { priceUnit: body.priceUnit }),
    ...(body.cleaningFeeKes !== undefined && { cleaningFeeKes: body.cleaningFeeKes }),
    ...(body.approxLat !== undefined && { approxLat: body.approxLat }),
    ...(body.approxLng !== undefined && { approxLng: body.approxLng }),
    ...(body.exactAddress !== undefined && { exactAddress: body.exactAddress }),
    ...(body.exactLat !== undefined && { exactLat: body.exactLat }),
    ...(body.exactLng !== undefined && { exactLng: body.exactLng }),
    ...(body.hostName !== undefined && { hostName: body.hostName }),
    ...(body.hostPhone !== undefined && { hostPhone: body.hostPhone }),
    ...(body.hostWhatsapp !== undefined && { hostWhatsapp: body.hostWhatsapp }),
    ...(body.vacant !== undefined && { vacant: body.vacant }),
  };
}
