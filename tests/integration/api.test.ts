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
import { POST as createSubscription } from "@/app/api/v1/subscriptions/route";
import { GET as getActiveSubscription } from "@/app/api/v1/subscriptions/active/route";
import { POST as confirmSubscriptionPayment } from "@/app/api/v1/subscriptions/[id]/confirm/route";
import { POST as createBnbBooking, GET as listBnbBookings } from "@/app/api/v1/bnb/bookings/route";
import { POST as confirmBnbBookingPayment } from "@/app/api/v1/bnb/bookings/[id]/confirm/route";
import { POST as postFeedback } from "@/app/api/v1/feedback/route";
import { POST as createLaundryOrder } from "@/app/api/v1/laundry/orders/route";
import { GET as myFeedback } from "@/app/api/v1/me/feedback/route";
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

describe("integration: subscriptions, bnb bookings, unlock", () => {
  const EMAIL = `unlock+${Date.now()}@juax.app`;
  const PASSWORD = "UnlockTest1!";
  let token = "";
  let rentalListingId = "";
  let bnbListingId = "";
  let subscriptionId = "";
  let bookingId = "";

  beforeAll(async () => {
    const rentalRes = await listings(
      jsonRequest("http://localhost/api/v1/listings?county=kisumu&type=rental"),
    );
    const rentals = await rentalRes.json();
    rentalListingId = rentals[0]?.id;
    expect(rentalListingId).toBeTruthy();

    const bnbRes = await listings(
      jsonRequest("http://localhost/api/v1/listings?county=kisumu&type=bnb"),
    );
    const bnbs = await bnbRes.json();
    bnbListingId = bnbs[0]?.id;
    expect(bnbListingId).toBeTruthy();

    const { POST: emailSignup } = await import("@/app/api/v1/auth/email/signup/route");
    const signupRes = await emailSignup(
      jsonRequest("http://localhost/api/v1/auth/email/signup", {
        email: EMAIL,
        password: PASSWORD,
        name: "Unlock Test User",
        county: "kisumu",
      }),
    );
    expect(signupRes.status).toBe(201);
    const signupData = await signupRes.json();
    token = signupData.token;
  });

  it("GET /subscriptions/active — no active sub yet", async () => {
    const res = await getActiveSubscription(
      jsonRequest("http://localhost/api/v1/subscriptions/active", undefined, token),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.active).toBe(false);
    expect(data.subscription).toBeNull();
  });

  it("rental detail stays locked without subscription", async () => {
    const res = await listingById(
      jsonRequest(`http://localhost/api/v1/listings/${rentalListingId}`, undefined, token),
      { params: { id: rentalListingId } },
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.locationLocked).toBe(true);
    expect(data).not.toHaveProperty("exactAddress");
  });

  it("POST /subscriptions + confirm unlocks rentals", async () => {
    const createRes = await createSubscription(
      jsonRequest("http://localhost/api/v1/subscriptions", { plan: "weekly" }, token),
    );
    const createData = await createRes.json();
    expect(createRes.status).toBe(201);
    expect(createData.subscription.paymentStatus).toBe("pending");
    subscriptionId = createData.subscription.id;

    const confirmRes = await confirmSubscriptionPayment(
      jsonRequest(
        `http://localhost/api/v1/subscriptions/${subscriptionId}/confirm`,
        {},
        token,
      ),
      { params: { id: subscriptionId } },
    );
    const confirmData = await confirmRes.json();
    expect(confirmRes.status).toBe(200);
    expect(confirmData.subscription.paymentStatus).toBe("success");
    expect(confirmData.subscription.active).toBe(true);

    const activeRes = await getActiveSubscription(
      jsonRequest("http://localhost/api/v1/subscriptions/active", undefined, token),
    );
    const activeData = await activeRes.json();
    expect(activeData.active).toBe(true);
  });

  it("rental detail unlocks after active subscription", async () => {
    const res = await listingById(
      jsonRequest(`http://localhost/api/v1/listings/${rentalListingId}`, undefined, token),
      { params: { id: rentalListingId } },
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.locationLocked).toBe(false);
    expect(data.exactAddress).toBeTruthy();
    expect(data.hostPhone).toBeTruthy();
  });

  it("bnb detail stays locked without booking", async () => {
    const res = await listingById(
      jsonRequest(`http://localhost/api/v1/listings/${bnbListingId}`, undefined, token),
      { params: { id: bnbListingId } },
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.locationLocked).toBe(true);
  });

  it("POST /bnb/bookings + confirm unlocks that bnb", async () => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 3);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 2);
    const createRes = await createBnbBooking(
      jsonRequest(
        "http://localhost/api/v1/bnb/bookings",
        {
          listingId: bnbListingId,
          checkIn: checkIn.toISOString().slice(0, 10),
          checkOut: checkOut.toISOString().slice(0, 10),
          guests: 2,
        },
        token,
      ),
    );
    const createData = await createRes.json();
    expect(createRes.status).toBe(201);
    expect(createData.booking.paymentStatus).toBe("pending");
    expect(createData.booking.totalKes).toBeGreaterThan(0);
    bookingId = createData.booking.id;

    const confirmRes = await confirmBnbBookingPayment(
      jsonRequest(
        `http://localhost/api/v1/bnb/bookings/${bookingId}/confirm`,
        {},
        token,
      ),
      { params: { id: bookingId } },
    );
    const confirmData = await confirmRes.json();
    expect(confirmRes.status).toBe(200);
    expect(confirmData.booking.confirmed).toBe(true);

    const listRes = await listBnbBookings(
      jsonRequest("http://localhost/api/v1/bnb/bookings", undefined, token),
    );
    const listData = await listRes.json();
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listData)).toBe(true);
    expect(listData.some((b: { id: string }) => b.id === bookingId)).toBe(true);
  });

  it("bnb detail unlocks after confirmed booking", async () => {
    const res = await listingById(
      jsonRequest(`http://localhost/api/v1/listings/${bnbListingId}`, undefined, token),
      { params: { id: bnbListingId } },
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.locationLocked).toBe(false);
    expect(data.exactAddress).toBeTruthy();
  });

  it("GET /me/feedback returns user FUA feedback", async () => {
    const orderRes = await createLaundryOrder(
      jsonRequest(
        "http://localhost/api/v1/laundry/orders",
        {
          pickupMode: "door",
          pickupAddress: "Test Rd",
          pickupCounty: "kisumu",
          loadKg: 3,
          scheduleDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          scheduleBand: "morning",
        },
        token,
      ),
    );
    expect(orderRes.status).toBe(201);
    const order = await orderRes.json();

    const fbRes = await postFeedback(
      jsonRequest(
        "http://localhost/api/v1/feedback",
        {
          service: "fua",
          category: "rating",
          rating: 5,
          body: "Integration test feedback for FUA order quality.",
          orderId: order.id,
        },
        token,
      ),
    );
    expect(fbRes.status).toBe(201);

    const listRes = await myFeedback(
      jsonRequest("http://localhost/api/v1/me/feedback?service=fua", undefined, token),
    );
    const listData = await listRes.json();
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listData.feedback)).toBe(true);
    expect(listData.feedback.some((f: { orderId: string }) => f.orderId === order.id)).toBe(true);
  });
});
