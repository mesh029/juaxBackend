import { describe, expect, it } from "vitest";
import { normalizeKenyaPhone } from "@/lib/auth/phone";
import { hashOtpCode, verifyOtpCode } from "@/lib/auth/otp-crypto";

describe("normalizeKenyaPhone", () => {
  it("accepts 9-digit local format", () => {
    expect(normalizeKenyaPhone("712345678")).toBe("+254712345678");
  });

  it("accepts 0-prefixed format", () => {
    expect(normalizeKenyaPhone("0712345678")).toBe("+254712345678");
  });

  it("accepts E.164 format", () => {
    expect(normalizeKenyaPhone("+254712345678")).toBe("+254712345678");
  });

  it("rejects invalid numbers", () => {
    expect(normalizeKenyaPhone("12345")).toBeNull();
    expect(normalizeKenyaPhone("+15551234567")).toBeNull();
  });
});

describe("otp crypto", () => {
  it("hashes and verifies codes", () => {
    const hash = hashOtpCode("123456");
    expect(verifyOtpCode("123456", hash)).toBe(true);
    expect(verifyOtpCode("000000", hash)).toBe(false);
  });
});
