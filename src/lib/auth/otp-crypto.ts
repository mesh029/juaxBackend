import { createHash, randomInt } from "crypto";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_SEND_LIMIT = 3;
export const OTP_SEND_WINDOW_MS = 15 * 60 * 1000;

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function verifyOtpCode(code: string, hash: string): boolean {
  return hashOtpCode(code) === hash;
}
