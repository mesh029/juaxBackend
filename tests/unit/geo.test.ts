import { describe, expect, it } from "vitest";
import { haversineKm } from "@/lib/geo";

describe("haversineKm", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineKm(-0.0917, 34.768, -0.0917, 34.768)).toBeCloseTo(0, 5);
  });

  it("computes plausible Kisumu distances", () => {
    const km = haversineKm(-0.0917, 34.768, -0.1083, 34.7634);
    expect(km).toBeGreaterThan(1);
    expect(km).toBeLessThan(5);
  });
});
