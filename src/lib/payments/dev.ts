import { PRODUCTION_TODO } from "@/lib/production-todos";

/** Simulated M-Pesa success until Daraja STK + webhooks ship (Phase 6). */
export function isPaymentDevMode(): boolean {
  if (process.env.PAYMENT_DEV_MODE === "true") return true;
  if (process.env.PAYMENT_DEV_MODE === "false") return false;
  // PRODUCTION_TODO: PAYMENT_DEV_MODE — see lib/production-todos.ts (MPESA_DARAJA)
  void PRODUCTION_TODO.MPESA_DARAJA;
  return process.env.NODE_ENV !== "production";
}
