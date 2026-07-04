import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as sendOtp } from "@/app/api/v1/auth/otp/send/route";
import { POST as verifyOtp } from "@/app/api/v1/auth/otp/verify/route";
import { GET as getMe } from "@/app/api/v1/me/route";
import { GET as health } from "@/app/api/health/route";
import { GET as listings } from "@/app/api/v1/listings/route";
import { GET as listingById } from "@/app/api/v1/listings/[id]/route";
import { GET as nearbyListings } from "@/app/api/v1/listings/nearby/route";
import { GET as subscriptionPlans } from "@/app/api/v1/subscriptions/plans/route";
import { prisma } from "@/lib/db";

/** Unique per run to avoid OTP rate-limit collisions across test runs. */
const TEST_PHONE = `79${String(Date.now()).slice(-7)}`;
const ADMIN_PHONE = "700000001";

function jsonRequest(url: string, body?: unknown, token?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("integration: health + listings", () => {
  let sampleListingId = "";

  it("health connects to Aiven", async () => {
    const res = await health(jsonRequest("http://localhost/api/health"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.db).toBe("connected");
  });

  it("returns published Kisumu listings", async () => {
    const res = await listings(
      jsonRequest("http://localhost/api/v1/listings?county=kisumu"),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(3);
    expect(data[0]).not.toHaveProperty("exactAddress");
    expect(data[0]).not.toHaveProperty("hostPhone");
    expect(data[0]).toHaveProperty("locationLocked", true);
    sampleListingId = data[0].id;
  });

  it("filters rentals to vacant only", async () => {
    const res = await listings(
      jsonRequest("http://localhost/api/v1/listings?county=kisumu&type=rental"),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.length).toBeGreaterThanOrEqual(2);
    expect(data.every((l: { type: string }) => l.type === "rental")).toBe(true);
  });

  it("filters bnb listings only", async () => {
    const res = await listings(
      jsonRequest("http://localhost/api/v1/listings?county=kisumu&type=bnb"),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.every((l: { type: string }) => l.type === "bnb")).toBe(true);
  });

  it("listing detail hides gated fields for anonymous users", async () => {
    const res = await listingById(
      jsonRequest(`http://localhost/api/v1/listings/${sampleListingId}`),
      { params: { id: sampleListingId } },
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.locationLocked).toBe(true);
    expect(data).not.toHaveProperty("exactAddress");
    expect(data).not.toHaveProperty("hostPhone");
  });

  it("returns 404 for unknown listing", async () => {
    const res = await listingById(
      jsonRequest(
        "http://localhost/api/v1/listings/00000000-0000-4000-8000-000000009999",
      ),
      { params: { id: "00000000-0000-4000-8000-000000009999" } },
    );
    expect(res.status).toBe(404);
  });

  it("nearby respects default radius from settings", async () => {
    const res = await nearbyListings(
      jsonRequest(
        "http://localhost/api/v1/listings/nearby?lat=-0.0917&lng=34.7680&radiusKm=10",
      ),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.radiusKm).toBe(10);
    expect(data.listings.length).toBeGreaterThanOrEqual(3);
    expect(data.listings[0]).toHaveProperty("distanceKm");
    expect(data.listings[0]).not.toHaveProperty("exactAddress");
  });

  it("nearby rejects missing coordinates", async () => {
    const res = await nearbyListings(
      jsonRequest("http://localhost/api/v1/listings/nearby"),
    );
    expect(res.status).toBe(400);
  });
});

describe("integration: subscription plans", () => {
  it("returns daily, weekly, monthly plans", async () => {
    const res = await subscriptionPlans(
      jsonRequest("http://localhost/api/v1/subscriptions/plans"),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.plans).toHaveLength(3);
    expect(data.plans.map((p: { plan: string }) => p.plan)).toEqual([
      "daily",
      "weekly",
      "monthly",
    ]);
    expect(data.plans[0].priceKes).toBe(99);
  });
});

describe("integration: auth flow", () => {
  let token = "";
  let devCode = "";

  beforeAll(async () => {
    await prisma.otpSession.deleteMany({
      where: { phoneE164: `+254${ADMIN_PHONE}` },
    });
  });

  it("sends OTP and returns devCode in development", async () => {
    const res = await sendOtp(
      jsonRequest("http://localhost/api/v1/auth/otp/send", { phone: TEST_PHONE }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.devCode).toMatch(/^\d{6}$/);
    devCode = data.devCode;
  });

  it("rejects wrong OTP", async () => {
    const res = await verifyOtp(
      jsonRequest("http://localhost/api/v1/auth/otp/verify", {
        phone: TEST_PHONE,
        code: "000000",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("verifies OTP and returns JWT", async () => {
    const res = await verifyOtp(
      jsonRequest("http://localhost/api/v1/auth/otp/verify", {
        phone: TEST_PHONE,
        code: devCode,
        name: "Test User",
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.token).toBeTruthy();
    expect(data.user.phone).toBe(`+254${TEST_PHONE}`);
    expect(data.user.role).toBe("user");
    expect(data.user.displayName).toBe("Test User");
    token = data.token;
  });

  it("GET /me returns profile with token", async () => {
    const res = await getMe(jsonRequest("http://localhost/api/v1/me", undefined, token));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.user.phone).toBe(`+254${TEST_PHONE}`);
  });

  it("GET /me without token returns 401", async () => {
    const res = await getMe(jsonRequest("http://localhost/api/v1/me"));
    expect(res.status).toBe(401);
  });

  it("seeded admin phone resolves admin role", async () => {
    const sendRes = await sendOtp(
      jsonRequest("http://localhost/api/v1/auth/otp/send", { phone: ADMIN_PHONE }),
    );
    const sendData = await sendRes.json();
    const verifyRes = await verifyOtp(
      jsonRequest("http://localhost/api/v1/auth/otp/verify", {
        phone: ADMIN_PHONE,
        code: sendData.devCode,
      }),
    );
    const verifyData = await verifyRes.json();
    expect(verifyRes.status).toBe(200);
    expect(verifyData.user.role).toBe("admin");
    expect(verifyData.user.displayName).toBe("Jua Admin");
  });
});
