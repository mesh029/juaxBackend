import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as sendOtp } from "@/app/api/v1/auth/otp/send/route";
import { POST as verifyOtp } from "@/app/api/v1/auth/otp/verify/route";
import { GET as getMe } from "@/app/api/v1/me/route";
import { GET as health } from "@/app/api/health/route";
import { GET as listings } from "@/app/api/v1/listings/route";
import { GET as listingById } from "@/app/api/v1/listings/[id]/route";
import { GET as nearbyListings } from "@/app/api/v1/listings/nearby/route";
import { GET as subscriptionPlans } from "@/app/api/v1/subscriptions/plans/route";
import { GET as catalogBootstrap } from "@/app/api/v1/catalog/bootstrap/route";
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

  it("catalog bootstrap returns bundled public data in one response", async () => {
    const res = await catalogBootstrap(
      jsonRequest("http://localhost/api/v1/catalog/bootstrap?county=kisumu"),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.county).toBe("kisumu");
    expect(Array.isArray(data.listings.rental)).toBe(true);
    expect(Array.isArray(data.listings.bnb)).toBe(true);
    expect(data.listings.rental.length).toBeGreaterThanOrEqual(2);
    expect(data.listings.bnb.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(data.laundryStations)).toBe(true);
    expect(Array.isArray(data.mamaFua.tasks)).toBe(true);
    expect(Array.isArray(data.mamaFua.convenienceTimes)).toBe(true);
    expect(data.mamaFua.convenienceTimes.length).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(data.subscriptionPlans)).toBe(true);
    expect(data.listings.rental[0]).not.toHaveProperty("exactAddress");
    if (data.listings.rental[0].coverImageUrl) {
      expect(typeof data.listings.rental[0].coverImageUrl).toBe("string");
    }
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
    expect(verifyData.user.displayName).toBeTruthy();
  });
});

describe("integration: signin vs signup", () => {
  const SIGNUP_PHONE = `78${String(Date.now()).slice(-7)}`;

  it("signup rejects existing admin phone", async () => {
    const send = await sendOtp(
      jsonRequest("http://localhost/api/v1/auth/otp/send", { phone: ADMIN_PHONE }),
    );
    const sendData = await send.json();
    const { POST: signupVerify } = await import("@/app/api/v1/auth/signup/verify/route");
    const res = await signupVerify(
      jsonRequest("http://localhost/api/v1/auth/signup/verify", {
        phone: ADMIN_PHONE,
        code: sendData.devCode,
        name: "Duplicate",
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("account_exists");
  });

  it("signin rejects unknown phone", async () => {
    const unknown = `77${String(Date.now()).slice(-7)}`;
    const { POST: signinSend } = await import("@/app/api/v1/auth/signin/send/route");
    const { POST: signinVerify } = await import("@/app/api/v1/auth/signin/verify/route");
    const sendRes = await signinSend(
      jsonRequest("http://localhost/api/v1/auth/signin/send", { phone: unknown }),
    );
    const sendData = await sendRes.json();
    const verifyRes = await signinVerify(
      jsonRequest("http://localhost/api/v1/auth/signin/verify", {
        phone: unknown,
        code: sendData.devCode,
      }),
    );
    expect(verifyRes.status).toBe(404);
    const data = await verifyRes.json();
    expect(data.error).toBe("account_not_found");
  });

  it("signup creates user with profile fields", async () => {
    const { POST: signupSend } = await import("@/app/api/v1/auth/signup/send/route");
    const { POST: signupVerify } = await import("@/app/api/v1/auth/signup/verify/route");
    const sendRes = await signupSend(
      jsonRequest("http://localhost/api/v1/auth/signup/send", { phone: SIGNUP_PHONE }),
    );
    const sendData = await sendRes.json();
    expect(sendData.devMode).toBe(true);
    expect(sendData.devCode).toMatch(/^\d{6}$/);
    const verifyRes = await signupVerify(
      jsonRequest("http://localhost/api/v1/auth/signup/verify", {
        phone: SIGNUP_PHONE,
        code: sendData.devCode,
        name: "Signup Test",
        county: "kisumu",
      }),
    );
    expect(verifyRes.status).toBe(201);
    const data = await verifyRes.json();
    expect(data.isNewUser).toBe(true);
    expect(data.user.displayName).toBe("Signup Test");
    expect(data.user.county).toBe("kisumu");
  });
});

describe("integration: email auth", () => {
  const EMAIL = `test+${Date.now()}@juax.app`;
  const PASSWORD = "TestPass123!";

  it("signs up and signs in with email/password", async () => {
    const { POST: emailSignup } = await import("@/app/api/v1/auth/email/signup/route");
    const { POST: emailSignin } = await import("@/app/api/v1/auth/email/signin/route");

    const signupRes = await emailSignup(
      jsonRequest("http://localhost/api/v1/auth/email/signup", {
        email: EMAIL,
        password: PASSWORD,
        name: "Email Test User",
        county: "kisumu",
      }),
    );
    expect(signupRes.status).toBe(201);
    const signupData = await signupRes.json();
    expect(signupData.token).toBeTruthy();
    expect(signupData.user.email).toBe(EMAIL);

    const signinRes = await emailSignin(
      jsonRequest("http://localhost/api/v1/auth/email/signin", {
        email: EMAIL,
        password: PASSWORD,
      }),
    );
    expect(signinRes.status).toBe(200);
    const signinData = await signinRes.json();
    expect(signinData.user.displayName).toBe("Email Test User");

    const meRes = await getMe(
      jsonRequest("http://localhost/api/v1/me", undefined, signinData.token),
    );
    expect(meRes.status).toBe(200);
  });

  it("rejects wrong password", async () => {
    const { POST: emailSignin } = await import("@/app/api/v1/auth/email/signin/route");
    const res = await emailSignin(
      jsonRequest("http://localhost/api/v1/auth/email/signin", {
        email: EMAIL,
        password: "wrong-password",
      }),
    );
    expect(res.status).toBe(401);
  });
});
