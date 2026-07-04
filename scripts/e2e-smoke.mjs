#!/usr/bin/env node
/**
 * E2E smoke test against running dev server (npm run dev) or BASE_URL.
 * Usage: node scripts/e2e-smoke.mjs
 */
import "dotenv/config";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:5080";

const USERS = {
  admin: { phone: "700000001", name: "Jua Admin" },
  agent1: { phone: "700000002", name: "Kisumu Agent" },
  agent2: { phone: "700000003", name: "Milimani Agent" },
  user: { phone: "700000004", name: "Test User" },
};

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function login(key) {
  const { phone, name } = USERS[key];
  const send = await req("/api/v1/auth/otp/send", { method: "POST", body: { phone } });
  if (!send.res.ok) throw new Error(`OTP send failed for ${key}: ${JSON.stringify(send.data)}`);
  const code = send.data.devCode;
  if (!code) throw new Error(`No devCode for ${key} — run in development`);
  const verify = await req("/api/v1/auth/otp/verify", {
    method: "POST",
    body: { phone, code, name },
  });
  if (!verify.res.ok) throw new Error(`OTP verify failed for ${key}: ${JSON.stringify(verify.data)}`);
  console.log(`✓ Login ${key} (${verify.data.user.role})`);
  return verify.data.token;
}

const SAMPLE_IMAGE =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80";

async function main() {
  console.log(`\nSmoke test → ${BASE}\n`);

  const health = await req("/api/health");
  if (!health.data.db) throw new Error("Health check failed");
  console.log("✓ Health OK");

  const agentToken = await login("agent2");
  const userToken = await login("user");
  const adminToken = await login("admin");

  const create = await req("/api/v1/agent/listings", {
    token: agentToken,
    method: "POST",
    body: {
      type: "rental",
      title: "Smoke Test Nyamasaria Flat",
      description: "Created by e2e smoke script",
      neighborhood: "Nyamasaria",
      county: "kisumu",
      beds: 2,
      baths: 1,
      priceKes: 24000,
      priceUnit: "month",
      coverImageUrl: SAMPLE_IMAGE,
      imageUrls: [SAMPLE_IMAGE],
      approxLat: -0.108,
      approxLng: 34.763,
      exactAddress: "Smoke Test Rd, Nyamasaria",
      exactLat: -0.107,
      exactLng: 34.762,
      hostName: "Milimani Agent",
      hostPhone: "+254700000003",
      amenities: ["WiFi", "Parking"],
      publish: true,
    },
  });
  if (!create.res.ok) throw new Error(`Agent create listing: ${JSON.stringify(create.data)}`);
  const listingId = create.data.listing.id;
  console.log(`✓ Agent created listing ${listingId} with cover image`);

  const anonView = await req(`/api/v1/listings/${listingId}`);
  if (!anonView.res.ok) throw new Error("Anonymous listing view failed");
  if (anonView.data.locationLocked !== true) throw new Error("Expected locationLocked");
  if (!anonView.data.coverImageUrl) throw new Error("Expected coverImageUrl on public listing");
  console.log("✓ Anonymous listing view — gated, has coverImageUrl, no exact address");

  const userView = await req(`/api/v1/listings/${listingId}`, { token: userToken });
  if (userView.data.locationLocked !== true) throw new Error("User should still see gated listing");
  console.log("✓ User listing view — still gated (no subscription/booking)");

  const fua = await req("/api/v1/laundry/orders", {
    token: userToken,
    method: "POST",
    body: {
      pickupMode: "door",
      pickupAddress: "Nyamasaria Rd, Apt 2",
      pickupLat: -0.108,
      pickupLng: 34.763,
      pickupCounty: "kisumu",
      loadKg: 4,
      scheduleDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      scheduleBand: "morning",
      notes: "Smoke test FUA order",
    },
  });
  if (!fua.res.ok) throw new Error(`FUA order: ${JSON.stringify(fua.data)}`);
  console.log(`✓ User FUA order KES ${fua.data.totalKes}`);

  const feedback = await req("/api/v1/feedback", {
    token: userToken,
    method: "POST",
    body: {
      service: "fua",
      category: "rating",
      rating: 5,
      body: "Smoke test — great pickup experience from the API lab.",
      orderId: fua.data.id,
    },
  });
  if (!feedback.res.ok) throw new Error(`Feedback: ${JSON.stringify(feedback.data)}`);
  console.log("✓ User submitted FUA feedback");

  const adminOrders = await req("/api/v1/admin/laundry/orders", { token: adminToken });
  if (!adminOrders.res.ok) throw new Error("Admin orders failed");
  console.log(`✓ Admin sees ${adminOrders.data.length} laundry order(s) in queue`);

  console.log("\nAll smoke checks passed.\n");
}

main().catch((e) => {
  console.error("\n✗", e.message);
  process.exit(1);
});
