import { z } from "zod";
import { normalizeAmenities } from "@/lib/listings/amenities";

const urlSchema = z.string().url().max(2000);

const amenitySchema = z
  .array(z.string())
  .default([])
  .transform((arr) => normalizeAmenities(arr));

const imageUrlsSchema = z
  .array(urlSchema)
  .max(12)
  .default([])
  .transform((urls) => [...new Set(urls)]);

export const listingBodySchema = z.object({
  type: z.enum(["bnb", "rental"]),
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
  neighborhood: z.string().min(2).max(80),
  county: z.string().min(2).max(40).default("kisumu"),
  beds: z.number().int().min(0).max(20).default(1),
  baths: z.number().int().min(0).max(20).default(1),
  sqm: z.number().int().positive().optional(),
  furnished: z.boolean().default(false),
  amenities: amenitySchema.default([]),
  coverImageUrl: urlSchema.optional(),
  imageUrls: imageUrlsSchema,
  priceKes: z.number().int().positive(),
  priceUnit: z.enum(["night", "month"]),
  cleaningFeeKes: z.number().int().min(0).default(0),
  approxLat: z.number().min(-90).max(90),
  approxLng: z.number().min(-180).max(180),
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

export const adminListingBodySchema = listingBodySchema;
export const adminListingPatchSchema = listingBodySchema.partial().omit({ publish: true, agentId: true });
export const agentListingPatchSchema = adminListingPatchSchema;
