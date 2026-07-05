#!/usr/bin/env node
/**
 * Full API walkthrough — hits every data endpoint and prints JSON to the console.
 *
 * Usage:
 *   npm run dev          # terminal 1
 *   npm run walkthrough  # terminal 2
 *
 * Or against Vercel:
 *   SMOKE_BASE_URL=https://your-app.vercel.app npm run walkthrough
 */
import "dotenv/config";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:5080";
const DEMO_EMAIL = process.env.WALKTHROUGH_EMAIL ?? `walkthrough+${Date.now()}@juax.app`;
const DEMO_PASSWORD = process.env.WALKTHROUGH_PASSWORD ?? "Walkthrough1!";
const DEMO_NAME = "Walkthrough User";

const c = {
  title: (s) => console.log(`\n\x1b[1;36m━━ ${s} ━━\x1b[0m`),
  ok: (s) => console.log(`\x1b[32m✓\x1b[0m ${s}`),
  fail: (s) => console.log(`\x1b[31m✗\x1b[0m ${s}`),
  json: (label, data) => {
    console.log(`\x1b[90m${label}:\x1b[0m`);
    console.log(JSON.stringify(data, null, 2));
  },
};

async function call(name, path, opts = {}) {
  const method = opts.method ?? (opts.body ? "POST" : "GET");
  const url = `${BASE}${path}`;
  console.log(`\n\x1b[33m→\x1b[0m ${method} ${path}`);

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  c.json(`Response ${res.status}`, data);

  if (!res.ok && !opts.allowError) {
    throw new Error(`${name} failed (${res.status}): ${data.message ?? JSON.stringify(data)}`);
  }
  return { res, data };
}

async function main() {
  console.log(`\n\x1b[1mJua X API walkthrough\x1b[0m → ${BASE}\n`);

  // ── Public ──────────────────────────────────────────────────────────
  c.title("Health");
  const health = await call("Health", "/api/health");
  c.ok(`DB: ${health.data.db}`);

  c.title("Catalog bootstrap (app cold start)");
  const bootstrap = await call("Catalog bootstrap", "/api/v1/catalog/bootstrap?county=kisumu");
  c.ok(
    `${bootstrap.data.listings.rental.length} rentals, ${bootstrap.data.listings.bnb.length} bnbs, ${bootstrap.data.laundryStations.length} stations`,
  );

  c.title("Services");
  await call("Services", "/api/v1/services");

  c.title("Subscription plans");
  await call("Plans", "/api/v1/subscriptions/plans");

  c.title("Listings (public browse)");
  const listings = await call("Listings", "/api/v1/listings?county=kisumu");
  const listingId = listings.data[0]?.id;
  c.ok(`${listings.data.length} published listing(s)`);

  c.title("Listings nearby");
  await call("Nearby", "/api/v1/listings/nearby?lat=-0.0917&lng=34.768&radiusKm=10");

  if (listingId) {
    c.title("Listing detail (anonymous — location gated)");
    const detail = await call("Listing detail", `/api/v1/listings/${listingId}`);
    c.ok(
      detail.data.locationLocked
        ? `Gated — neighborhood: ${detail.data.neighborhood}, no exact address`
        : "Unlocked (unexpected for anon)",
    );
  }

  c.title("Laundry stations");
  await call("Stations", "/api/v1/laundry/stations");

  c.title("Mama Fua tasks");
  await call("Mama Fua tasks", "/api/v1/laundry/mamafua/tasks");

  // ── Email auth ──────────────────────────────────────────────────────
  c.title("Email sign up");
  const signup = await call("Email signup", "/api/v1/auth/email/signup", {
    method: "POST",
    body: {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      name: DEMO_NAME,
      county: "kisumu",
    },
  });
  let token = signup.data.token;
  c.ok(`Signed up ${signup.data.user.email} → role ${signup.data.user.role}`);

  c.title("Email sign in");
  const signin = await call("Email signin", "/api/v1/auth/email/signin", {
    method: "POST",
    body: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
  token = signin.data.token;
  c.ok(`Signed in as ${signin.data.user.displayName}`);

  c.title("Profile");
  await call("GET /me", "/api/v1/me", { token });
  await call("GET /me/profile", "/api/v1/me/profile", { token });

  if (listingId) {
    c.title("Listing detail (authenticated — still gated without subscription)");
    await call("Listing detail (auth)", `/api/v1/listings/${listingId}`, { token });
  }

  // ── FUA ─────────────────────────────────────────────────────────────
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  c.title("FUA price estimate");
  await call("FUA estimate", "/api/v1/laundry/orders/estimate", {
    token,
    method: "POST",
    body: {
      pickupMode: "door",
      pickupAddress: "Nyamasaria Rd, Walkthrough Apt",
      pickupCounty: "kisumu",
      loadKg: 5,
      scheduleDate: tomorrow,
      scheduleBand: "morning",
    },
  });

  c.title("Create FUA order");
  const order = await call("FUA order", "/api/v1/laundry/orders", {
    token,
    method: "POST",
    body: {
      pickupMode: "door",
      pickupAddress: "Nyamasaria Rd, Walkthrough Apt",
      pickupLat: -0.108,
      pickupLng: 34.763,
      pickupCounty: "kisumu",
      loadKg: 5,
      scheduleDate: tomorrow,
      scheduleBand: "morning",
      notes: "API walkthrough order",
    },
  });
  const orderId = order.data.id;
  c.ok(`Order ${orderId} — KES ${order.data.totalKes} — status ${order.data.status}`);

  c.title("My FUA orders");
  await call("Order list", "/api/v1/laundry/orders", { token });

  c.title("FUA order detail");
  await call("Order detail", `/api/v1/laundry/orders/${orderId}`, { token });

  c.title("Mama Fua order estimate");
  await call("Mama Fua estimate", "/api/v1/laundry/orders/estimate", {
    token,
    method: "POST",
    body: {
      pickupMode: "mamafua",
      pickupAddress: "Nyamasaria Rd",
      pickupCounty: "kisumu",
      tasks: ["vacuum_upholstery", "mop_floors"],
      scheduleDate: tomorrow,
      scheduleBand: "afternoon",
    },
  });

  // ── Feedback ────────────────────────────────────────────────────────
  c.title("Submit feedback");
  await call("Feedback", "/api/v1/feedback", {
    token,
    method: "POST",
    body: {
      service: "fua",
      category: "rating",
      rating: 5,
      body: "Walkthrough test — smooth API experience.",
      orderId,
    },
  });

  // ── Admin (dev login) ───────────────────────────────────────────────
  c.title("Admin dev login + queue");
  const admin = await call("Dev admin login", "/api/v1/auth/dev/login", {
    method: "POST",
    body: { role: "admin" },
    allowError: true,
  });
  if (admin.res.ok) {
    await call("Admin FUA queue", "/api/v1/admin/laundry/orders", { token: admin.data.token });
    await call("Admin users", "/api/v1/admin/users", { token: admin.data.token });
    c.ok("Admin endpoints OK");
  } else {
    c.fail("Dev login skipped (set OTP_DEV_MODE=true on server)");
  }

  console.log("\n\x1b[1;32mAll walkthrough checks passed.\x1b[0m\n");
  console.log("Frontend credentials used in this run:");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log("");
}

main().catch((e) => {
  c.fail(e.message);
  process.exit(1);
});
