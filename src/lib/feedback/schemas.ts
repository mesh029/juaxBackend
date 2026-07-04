import { z } from "zod";

export const feedbackBodySchema = z.object({
  service: z.enum(["fua", "mamafua", "bnb", "rental", "general", "app"]),
  category: z.enum(["rating", "complaint", "suggestion", "praise"]).default("rating"),
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(120).optional(),
  body: z.string().min(10).max(2000),
  orderId: z.string().uuid().optional(),
  listingId: z.string().uuid().optional(),
});

export const feedbackPatchSchema = z.object({
  status: z.enum(["new", "reviewed", "resolved"]).optional(),
  adminNotes: z.string().max(1000).optional(),
});

export type FeedbackBody = z.infer<typeof feedbackBodySchema>;

export function validateFeedbackBody(body: FeedbackBody): string | null {
  if (body.category === "rating" && body.rating == null) {
    return "rating is required for rating category";
  }
  if (body.category === "complaint" && body.body.length < 20) {
    return "Please describe your complaint in at least 20 characters";
  }
  return null;
}
