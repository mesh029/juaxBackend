import { z } from "zod";

export const subscriptionBodySchema = z.object({
  plan: z.enum(["daily", "weekly", "monthly"]),
});

export const confirmPaymentBodySchema = z.object({
  mpesaReceipt: z.string().max(32).optional(),
});
