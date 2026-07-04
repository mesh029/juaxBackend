export type ListingTypeFilter = "bnb" | "rental" | null;

export function parseListingTypeFilter(type: string | null): ListingTypeFilter {
  if (type === "rental" || type === "bnb") return type;
  return null;
}

export function buildTypeFilterSql(type: ListingTypeFilter): string {
  if (type === "rental") return "AND type = 'rental' AND vacant = TRUE";
  if (type === "bnb") return "AND type = 'bnb'";
  return "";
}

export function parsePagination(
  limitParam: string | null,
  offsetParam: string | null,
): { limit: number; offset: number } {
  const limit = Math.min(Math.max(Number(limitParam ?? 50) || 50, 1), 100);
  const offset = Math.max(Number(offsetParam ?? 0) || 0, 0);
  return { limit, offset };
}
