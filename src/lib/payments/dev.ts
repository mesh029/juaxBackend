/** Simulated M-Pesa success until Daraja STK + webhooks ship (Phase 6). */
export function isPaymentDevMode(): boolean {
  if (process.env.PAYMENT_DEV_MODE === "true") return true;
  if (process.env.PAYMENT_DEV_MODE === "false") return false;
  return process.env.NODE_ENV !== "production";
}
