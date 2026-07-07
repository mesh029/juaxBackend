import { z } from "zod";

export const listingRequestKindSchema = z.enum(["viewing", "tour", "stay"]);

export const listingRequestStatusSchema = z.enum([
  "requested",
  "agent_contacted",
  "rider_assigned",
  "rider_en_route",
  "viewing_completed",
  "cancelled",
]);

export const viewingPickupModeSchema = z.enum(["taxi", "rider"]);

export const createListingRequestSchema = z
  .object({
    listingId: z.string().uuid(),
    kind: listingRequestKindSchema,
    userNote: z.string().max(1000).optional(),
    pickupMode: viewingPickupModeSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "viewing" && !data.pickupMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pickupMode is required for viewing requests",
        path: ["pickupMode"],
      });
    }
  });

export const adminUpdateListingRequestSchema = z.object({
  status: listingRequestStatusSchema.optional(),
  riderName: z.string().max(120).optional(),
  riderPhone: z.string().max(32).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export const listingRequestMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

export type CreateListingRequestBody = z.infer<typeof createListingRequestSchema>;
export type AdminUpdateListingRequestBody = z.infer<typeof adminUpdateListingRequestSchema>;
export type ListingRequestMessageBody = z.infer<typeof listingRequestMessageSchema>;
