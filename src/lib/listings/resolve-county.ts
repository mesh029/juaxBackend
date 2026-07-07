import { isKisumuOnlyListings } from "@/lib/app-settings";

export const PILOT_LISTING_COUNTIES = ["kisumu", "nairobi", "mombasa", "nyamira"] as const;

export type PilotListingCounty = (typeof PILOT_LISTING_COUNTIES)[number];

export function isPilotListingCounty(value: string): value is PilotListingCounty {
  return (PILOT_LISTING_COUNTIES as readonly string[]).includes(value.toLowerCase());
}

/**
 * Honor explicit pilot county from clients (e.g. Nyamira when user is on the ground).
 * `kisumu_only_listings` only applies when the requested county is missing or not a pilot county.
 */
export async function resolveListingsCounty(requested: string | null | undefined): Promise<string> {
  const normalized = (requested ?? "kisumu").trim().toLowerCase();
  if (isPilotListingCounty(normalized)) {
    return normalized;
  }
  if (await isKisumuOnlyListings()) {
    return "kisumu";
  }
  return normalized || "kisumu";
}
