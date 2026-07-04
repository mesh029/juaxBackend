import { prisma } from "@/lib/db";

const cache = new Map<string, { value: unknown; fetchedAt: number }>();
const TTL_MS = 60_000;

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < TTL_MS) {
    return hit.value as T;
  }

  const row = await prisma.appSetting.findUnique({ where: { key } });
  const raw = row?.valueJson;
  const value = raw === undefined ? fallback : (raw as T);
  cache.set(key, { value, fetchedAt: Date.now() });
  return value;
}

export async function getDefaultSearchRadiusKm(): Promise<number> {
  const value = await getSetting("default_search_radius_km", 5);
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export async function isKisumuOnlyListings(): Promise<boolean> {
  const value = await getSetting<boolean | string>("kisumu_only_listings", true);
  return value === true || value === "true";
}

export function clearAppSettingsCache(): void {
  cache.clear();
}
