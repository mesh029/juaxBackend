import { webcrypto } from "node:crypto";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

// Deterministic test env for payment confirm + OTP flows
process.env.PAYMENT_DEV_MODE ??= "true";
process.env.OTP_DEV_MODE ??= "true";
