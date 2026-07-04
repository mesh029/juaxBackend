/** Standard amenities — stored as labels in `listings.amenities`. */
export const LISTING_AMENITY_OPTIONS = [
  "WiFi",
  "Water 24/7",
  "Parking",
  "Security",
  "AC",
  "Kitchen",
  "Kitchenette",
  "Furnished",
  "Balcony",
  "Lake View",
  "Backup Power",
  "CCTV",
  "Elevator",
  "Pet Friendly",
  "Laundry",
] as const;

export type ListingAmenity = (typeof LISTING_AMENITY_OPTIONS)[number];

export function normalizeAmenities(selected: string[]): string[] {
  const allowed = new Set<string>(LISTING_AMENITY_OPTIONS);
  return [...new Set(selected.filter((a) => allowed.has(a)))];
}
