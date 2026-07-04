import { describe, expect, it } from "vitest";
import {
  isListingUnlocked,
  toListingResponse,
  toPublicListing,
  toUnlockedListing,
  type ListingGatedRow,
  type ListingPublicRow,
  type UnlockContext,
} from "@/lib/location-gate";

const baseRow: ListingPublicRow = {
  id: "00000000-0000-4000-8000-000000000099",
  type: "rental",
  title: "Test Flat",
  description: "A test listing",
  neighborhood: "Nyamasaria",
  county: "kisumu",
  beds: 2,
  baths: 1,
  sqm: 68,
  furnished: true,
  amenities: ["Water"],
  price_kes: 22000,
  price_unit: "month",
  approx_lat: -0.1083,
  approx_lng: 34.7634,
  vacant: true,
};

const gated: ListingGatedRow = {
  ...baseRow,
  exact_address: "Secret Rd",
  exact_lat: -0.1065,
  exact_lng: 34.761,
  host_name: "Joseph O.",
  host_phone: "+254722456789",
  host_whatsapp: "254722456789",
};

const noUnlock: UnlockContext = {
  userId: "user-1",
  hasActiveRentalSubscription: false,
  confirmedBnbListingIds: new Set(),
};

describe("toPublicListing", () => {
  it("never exposes gated fields", () => {
    const dto = toPublicListing(baseRow);
    expect(dto).toMatchObject({
      locationLocked: true,
      approxPin: { lat: baseRow.approx_lat, lng: baseRow.approx_lng },
    });
    expect(dto).not.toHaveProperty("exactAddress");
    expect(dto).not.toHaveProperty("hostPhone");
    expect(dto).not.toHaveProperty("exactPin");
  });

  it("includes distance when provided", () => {
    const dto = toPublicListing(baseRow, 1.234);
    expect(dto).toHaveProperty("distanceKm", 1.23);
  });
});

describe("isListingUnlocked", () => {
  it("requires active subscription for rentals", () => {
    const ctx: UnlockContext = {
      userId: "user-1",
      hasActiveRentalSubscription: true,
      confirmedBnbListingIds: new Set(),
    };
    expect(isListingUnlocked(baseRow, ctx)).toBe(true);
    expect(isListingUnlocked(baseRow, noUnlock)).toBe(false);
    expect(isListingUnlocked(baseRow, { ...noUnlock, userId: null })).toBe(false);
  });

  it("requires confirmed booking for bnb", () => {
    const bnb = { ...baseRow, type: "bnb" as const };
    const ctx: UnlockContext = {
      userId: "user-1",
      hasActiveRentalSubscription: false,
      confirmedBnbListingIds: new Set([bnb.id]),
    };
    expect(isListingUnlocked(bnb, ctx)).toBe(true);
    expect(isListingUnlocked(bnb, noUnlock)).toBe(false);
  });
});

describe("toUnlockedListing", () => {
  it("includes exact location and host contact", () => {
    const dto = toUnlockedListing(gated);
    expect(dto.locationLocked).toBe(false);
    expect(dto).toMatchObject({
      exactAddress: "Secret Rd",
      exactPin: { lat: -0.1065, lng: 34.761 },
      hostName: "Joseph O.",
      hostPhone: "+254722456789",
    });
  });
});

describe("toListingResponse", () => {
  it("returns public DTO when locked", () => {
    const dto = toListingResponse(baseRow, noUnlock, gated);
    expect(dto.locationLocked).toBe(true);
    expect(dto).not.toHaveProperty("exactAddress");
  });

  it("returns unlocked DTO when context allows", () => {
    const ctx: UnlockContext = {
      userId: "user-1",
      hasActiveRentalSubscription: true,
      confirmedBnbListingIds: new Set(),
    };
    const dto = toListingResponse(baseRow, ctx, gated);
    expect(dto.locationLocked).toBe(false);
    expect(dto).toHaveProperty("exactAddress", "Secret Rd");
  });
});
