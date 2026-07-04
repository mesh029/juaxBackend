import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes and verifies", () => {
    const hash = hashPassword("Test1234!");
    expect(hash).toContain(":");
    expect(verifyPassword("Test1234!", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });
});
