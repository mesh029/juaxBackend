import { describe, expect, it } from "vitest";
import {
  computeLaundryPricing,
  computeMamaFuaPricing,
  computeOrderPricing,
  DEFAULT_PICKUP_FEE_KES,
  DEFAULT_RATE_PER_KG,
  MAMA_FUA_DISPATCH_FEE_KES,
} from "@/lib/laundry/pricing";

describe("computeLaundryPricing", () => {
  it("door pickup includes fee", () => {
    const r = computeLaundryPricing({ pickupMode: "door", loadKg: 4 });
    expect(r.ratePerKg).toBe(DEFAULT_RATE_PER_KG);
    expect(r.pickupFeeKes).toBe(DEFAULT_PICKUP_FEE_KES);
    expect(r.totalKes).toBe(4 * DEFAULT_RATE_PER_KG + DEFAULT_PICKUP_FEE_KES);
  });

  it("station pickup has no fee", () => {
    const r = computeLaundryPricing({ pickupMode: "station", loadKg: 5 });
    expect(r.pickupFeeKes).toBe(0);
    expect(r.totalKes).toBe(5 * DEFAULT_RATE_PER_KG);
  });
});

describe("computeMamaFuaPricing", () => {
  it("sums dispatch fee and selected tasks", () => {
    const r = computeMamaFuaPricing({
      tasks: ["wash_utensils", "mop_floors"],
    });
    expect(r.pickupFeeKes).toBe(MAMA_FUA_DISPATCH_FEE_KES);
    expect(r.tasksFeeKes).toBe(300 + 400);
    expect(r.totalKes).toBe(MAMA_FUA_DISPATCH_FEE_KES + 700);
    expect(r.taskLineItems).toHaveLength(2);
  });

  it("adds kg fee when laundry task selected with load", () => {
    const r = computeMamaFuaPricing({
      tasks: ["laundry"],
      loadKg: 4,
    });
    expect(r.tasksFeeKes).toBe(400 + 4 * DEFAULT_RATE_PER_KG);
    expect(r.taskLineItems.some((t) => t.id === "laundry_kg")).toBe(true);
  });
});

describe("computeOrderPricing", () => {
  it("routes mamafua mode to mamafua pricing", () => {
    const r = computeOrderPricing({
      pickupMode: "mamafua",
      tasks: ["vacuum_upholstery"],
    });
    expect(r.pickupFeeKes).toBe(MAMA_FUA_DISPATCH_FEE_KES);
    expect(r.tasksFeeKes).toBe(350);
  });
});
