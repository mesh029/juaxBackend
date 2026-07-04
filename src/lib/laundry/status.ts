import type { laundry_status } from "@prisma/client";

export const LAUNDRY_STEP_LABELS = [
  "Requested",
  "Pickup scheduled",
  "Collected",
  "Processing",
  "Ready",
  "Delivered",
] as const;

export const MAMA_FUA_STEP_LABELS = [
  "Requested",
  "Rider dispatched",
  "Mama Fua arrived",
  "Cleaning in progress",
  "Finishing up",
  "Completed",
] as const;

export type OrderStepLabels = typeof LAUNDRY_STEP_LABELS | typeof MAMA_FUA_STEP_LABELS;

export function orderStepLabels(pickupMode: string): readonly string[] {
  return pickupMode === "mamafua" ? MAMA_FUA_STEP_LABELS : LAUNDRY_STEP_LABELS;
}

const STATUS_INDEX: Record<laundry_status, number> = {
  requested: 0,
  pickup_scheduled: 1,
  collected: 2,
  processing: 3,
  ready: 4,
  delivered: 5,
  cancelled: -1,
};

const ALLOWED_NEXT: Record<laundry_status, laundry_status[]> = {
  requested: ["pickup_scheduled", "collected", "cancelled"],
  pickup_scheduled: ["collected", "cancelled"],
  collected: ["processing", "cancelled"],
  processing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function laundryStepIndex(status: laundry_status): number {
  return STATUS_INDEX[status] ?? 0;
}

export function canTransition(from: laundry_status, to: laundry_status): boolean {
  if (from === to) return true;
  return ALLOWED_NEXT[from]?.includes(to) ?? false;
}
