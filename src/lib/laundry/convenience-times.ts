/** Mama Fua visit time bands — mirrored in laundry order `scheduleBand`. */
export const MAMA_FUA_CONVENIENCE_BANDS = [
  {
    id: "asap",
    label: "Flexible",
    shortLabel: "Flexible · today",
    description: "Best available slot today — we confirm by SMS",
    timeWindow: null as string | null,
  },
  {
    id: "morning",
    label: "Morning",
    shortLabel: "Morning (8–12)",
    description: "Arrive between 8am and 12pm",
    timeWindow: "08:00–12:00",
  },
  {
    id: "afternoon",
    label: "Afternoon",
    shortLabel: "Afternoon (12–4)",
    description: "Arrive between 12pm and 4pm",
    timeWindow: "12:00–16:00",
  },
  {
    id: "evening",
    label: "Evening",
    shortLabel: "Evening (4–8)",
    description: "Arrive between 4pm and 8pm",
    timeWindow: "16:00–20:00",
  },
] as const;

export type ScheduleBandId = (typeof MAMA_FUA_CONVENIENCE_BANDS)[number]["id"];

const LABEL_BY_ID = Object.fromEntries(
  MAMA_FUA_CONVENIENCE_BANDS.map((b) => [b.id, b.shortLabel]),
) as Record<ScheduleBandId, string>;

export function getScheduleBandLabel(band: string): string {
  return LABEL_BY_ID[band as ScheduleBandId] ?? band;
}

export function listMamaFuaConvenienceBands() {
  return MAMA_FUA_CONVENIENCE_BANDS.map((b) => ({ ...b }));
}

/** Fields the mobile app should send on estimate/create for Mama Fua. */
export const MAMA_FUA_ORDER_INPUT_HINT = {
  pickupMode: "mamafua",
  required: ["pickupAddress", "tasks", "scheduleDate", "scheduleBand"],
  optional: ["pickupLat", "pickupLng", "pickupCounty", "loadKg", "notes"],
  scheduleDateFormat: "YYYY-MM-DD",
  scheduleBandValues: MAMA_FUA_CONVENIENCE_BANDS.map((b) => b.id),
} as const;
