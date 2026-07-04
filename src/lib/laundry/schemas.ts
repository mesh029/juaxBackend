import { z } from "zod";
import { MAMA_FUA_TASKS } from "@/lib/laundry/mamafua-tasks";

const taskIdSchema = z.enum(
  MAMA_FUA_TASKS.map((t) => t.id) as [string, ...string[]],
);

export const laundryOrderBodySchema = z.object({
  pickupMode: z.enum(["door", "station", "mamafua"]),
  stationId: z.string().uuid().optional(),
  pickupAddress: z.string().min(3).max(200).optional(),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  pickupCounty: z.string().max(40).optional(),
  loadKg: z.number().min(0).max(50).default(4),
  loadItems: z.number().int().min(1).max(100).optional(),
  /** Required when pickupMode is mamafua — selected cleaning tasks */
  tasks: z.array(taskIdSchema).default([]),
  scheduleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduleBand: z.enum(["morning", "afternoon", "evening", "asap"]),
  notes: z.string().max(500).optional(),
});

export type LaundryOrderBody = z.infer<typeof laundryOrderBodySchema>;

export function validateLaundryOrderBody(body: LaundryOrderBody): string | null {
  if (body.pickupMode === "door" && !body.pickupAddress?.trim()) {
    return "pickupAddress is required for door pickup";
  }
  if (body.pickupMode === "station" && !body.stationId) {
    return "stationId is required for station pickup";
  }
  if (body.pickupMode === "mamafua") {
    if (!body.pickupAddress?.trim()) {
      return "pickupAddress is required for Mama Fua visit";
    }
    if (!body.tasks.length) {
      return "Select at least one cleaning task for Mama Fua";
    }
  }
  return null;
}
