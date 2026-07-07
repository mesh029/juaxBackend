import { z } from "zod";

export const bnbBookingBodySchema = z.object({
  listingId: z.string().uuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(20).default(1),
});

export const confirmBookingPaymentBodySchema = z.object({
  mpesaReceipt: z.string().max(32).optional(),
});
