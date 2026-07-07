import { PRODUCTION_TODO } from "@/lib/production-todos";

/**
 * Simulated M-Pesa until Daraja STK + webhooks ship.
 * Kisumu pilot defaults to dummy checkout ON (including on Vercel production).
 * Set PILOT_DUMMY_PAYMENTS=false when real M-Pesa goes live.
 */
export function isPaymentDevMode(): boolean {
  if (process.env.PAYMENT_DEV_MODE === "true") return true;
  if (process.env.PAYMENT_DEV_MODE === "false") return false;
  if (process.env.PILOT_DUMMY_PAYMENTS === "false") return false;
  // PRODUCTION_TODO: PAYMENT_DEV_MODE — see lib/production-todos.ts (MPESA_DARAJA)
  void PRODUCTION_TODO.MPESA_DARAJA;
  return true;
}

/** Receipts sent by the mobile app during Kisumu pilot dummy checkout. */
export function isPilotDummyReceipt(receipt?: string | null): boolean {
  return !!receipt && /^(DUMMY-MPESA-|DEV-)/i.test(receipt.trim());
}

/** Allow payment confirm for pilot dummy checkout (with or without receipt body). */
export function canConfirmPilotPayment(_mpesaReceipt?: string | null): boolean {
  if (process.env.PAYMENT_DEV_MODE === "false" && process.env.PILOT_DUMMY_PAYMENTS === "false") {
    return false;
  }
  return isPaymentDevMode() || isPilotDummyReceipt(_mpesaReceipt);
}
