import { z } from "zod";
import { normalizeAmenities } from "@/lib/listings/amenities";

const amenitySchema = z
  .array(z.string())
  .default([])
  .transform((arr) => normalizeAmenities(arr));

export const adminListingBodySchema = z.object({
  type: z.enum(["bnb", "rental"]),
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
  /** Public area name e.g. Nyamasaria, Milimani */
  neighborhood: z.string().min(2).max(80),
  county: z.string().min(2).max(40).default("kisumu"),
  beds: z.number().int().min(0).max(20).default(1),
  baths: z.number().int().min(0).max(20).default(1),
  sqm: z.number().int().positive().optional(),
  furnished: z.boolean().default(false),
  amenities: amenitySchema.default([]),
  priceKes: z.number().int().positive(),
  priceUnit: z.enum(["night", "month"]),
  cleaningFeeKes: z.number().int().min(0).default(0),
  /** Map pin shown to free users (offset from exact) */
  approxLat: z.number().min(-90).max(90),
  approxLng: z.number().min(-180).max(180),
  /** Gated until subscription / booking */
  exactAddress: z.string().min(3).max(200),
  exactLat: z.number().min(-90).max(90),
  exactLng: z.number().min(-180).max(180),
  hostName: z.string().min(2).max(80),
  hostPhone: z.string().min(10).max(20),
  hostWhatsapp: z.string().min(9).max(20).optional(),
  vacant: z.boolean().default(true),
  publish: z.boolean().default(false),
  agentId: z.string().uuid().optional(),
});

export const adminListingPatchSchema = adminListingBodySchema
  .partial()
  .omit({ publish: true, agentId: true });
