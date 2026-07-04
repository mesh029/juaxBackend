export type ListingPublicRow = {
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
  price_kes: number;
  price_unit: string;
  approx_lat: number;
  approx_lng: number;
  vacant: boolean;
};

export type ListingGatedFields = {
  exact_address: string | null;
  exact_lat: number | null;
  exact_lng: number | null;
  host_name: string | null;
  host_phone: string | null;
  host_whatsapp: string | null;
};

export type ListingGatedRow = ListingPublicRow & ListingGatedFields;

export type UnlockContext = {
  userId: string | null;
  hasActiveRentalSubscription: boolean;
  confirmedBnbListingIds: Set<string>;
};

export const PUBLIC_LISTING_SELECT = `
  id, type, title, description, neighborhood, county,
  beds, baths, sqm, furnished, amenities, price_kes, price_unit,
  approx_lat, approx_lng, vacant
`;

export const GATED_LISTING_SELECT = `
  exact_address, exact_lat, exact_lng, host_name, host_phone, host_whatsapp
`;

/** Public browse — never exposes exact address, contact, or exact GPS. */
export function toPublicListing(row: ListingPublicRow, distanceKm?: number) {
  const dto: Record<string, unknown> = {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    neighborhood: row.neighborhood,
    locationName: row.neighborhood,
    county: row.county,
    beds: row.beds,
    baths: row.baths,
    sqm: row.sqm,
    furnished: row.furnished,
    amenities: row.amenities,
    priceKes: row.price_kes,
    priceUnit: row.price_unit,
    approxPin: { lat: row.approx_lat, lng: row.approx_lng },
    coordinates: {
      approx: { lat: row.approx_lat, lng: row.approx_lng },
    },
    locationLocked: true,
    vacant: row.vacant,
  };
  if (distanceKm !== undefined) {
    dto.distanceKm = Math.round(distanceKm * 100) / 100;
  }
  return dto;
}

export function isListingUnlocked(row: ListingPublicRow, ctx: UnlockContext): boolean {
  if (!ctx.userId) return false;
  if (row.type === "rental") return ctx.hasActiveRentalSubscription;
  if (row.type === "bnb") return ctx.confirmedBnbListingIds.has(row.id);
  return false;
}

/** Full detail when subscription or booking unlock applies. */
export function toUnlockedListing(row: ListingGatedRow, distanceKm?: number) {
  const dto: Record<string, unknown> = {
    ...toPublicListing(row, distanceKm),
    locationLocked: false,
    exactAddress: row.exact_address,
    exactPin: { lat: row.exact_lat, lng: row.exact_lng },
    coordinates: {
      approx: { lat: row.approx_lat, lng: row.approx_lng },
      exact: { lat: row.exact_lat, lng: row.exact_lng },
    },
    hostName: row.host_name,
    hostPhone: row.host_phone,
    hostWhatsapp: row.host_whatsapp,
  };
  return dto;
}

export function toListingResponse(
  row: ListingPublicRow,
  ctx: UnlockContext,
  gated?: ListingGatedFields | null,
  distanceKm?: number,
) {
  if (isListingUnlocked(row, ctx) && gated) {
    return toUnlockedListing({ ...row, ...gated }, distanceKm);
  }
  return toPublicListing(row, distanceKm);
}
