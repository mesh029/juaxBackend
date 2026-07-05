# Jua X Backend — Implementation Progress

**Last updated:** July 4, 2026  
**Overall completion:** **~75%** of MVP backend + ops console scope

---

## Summary

| Area | Progress | Notes |
|------|----------|--------|
| **Overall MVP** | **75%** | API tested end-to-end via walkthrough script |
| Foundation & DB | 95% | Aiven live, Prisma, migrations 001–006 |
| Auth & profiles | 98% | **Email/password** + OTP + dev login + profiles |
| Saka Keja browse | 90% | Listings, nearby, location gate, plans |
| FUA / Mama Fua | 88% | Orders, mamafua tasks, tracking, admin queue |
| Admin ops console | 80% | Listings, FUA, feedback, users, map |
| Payments (M-Pesa) | 0% | Phase 6 |
| Expo app integration | 10% | [FRONTEND_AUTH.md](./docs/FRONTEND_AUTH.md) ready |
| Deploy (Vercel) | 15% | Use Aiven **pooler** URL + `connection_limit=1` |

---

## Vercel + Aiven (~20 connections)

You can stay on **Vercel + direct Aiven** for a pilot if you avoid connection leaks.

### What the codebase does

| Guard | Status |
|-------|--------|
| **Single `PrismaClient`** | `src/lib/db.ts` — import `{ prisma }` from `@/lib/db` or `@/lib/prisma` only |
| **Never** `new PrismaClient()` in routes | Audited — only one instance in `db.ts` |
| **globalThis cache in production** | Yes — required on Vercel (dev-only cache is a common bug) |
| **`connection_limit=1`** on Vercel | Auto when `VERCEL` env is set |
| **Node runtime** | API routes use Node (not Edge) |

```typescript
// ✅ Everywhere in the app
import { prisma } from "@/lib/prisma";

// ❌ Never in route handlers
const prisma = new PrismaClient();
```

### The 20-connection budget

Aiven hobby ≈ **20 connections**. With `connection_limit=1` per serverless instance:

- Each warm Vercel function ≈ **1** DB connection  
- ~**18–20** concurrent warm instances max before errors  
- Fine for MVP / low traffic; bursts or many parallel requests can still hit the limit  

**Vercel env (direct Aiven, no Accelerate):**

```
DATABASE_URL=postgres://…direct aiven…?sslmode=require
DIRECT_URL=postgres://…same…?sslmode=require
PRISMA_CONNECTION_LIMIT=1
```

If you still see “too many connections” under real load → add [Prisma Accelerate](https://console.prisma.io) (free tier) or upgrade Aiven. See [docs/DATABASE_POOLING.md](./docs/DATABASE_POOLING.md).

**Developer guide (required reading):** [docs/CONNECTION_BUDGET.md](./docs/CONNECTION_BUDGET.md) — Prisma singleton, client fan-out rules, bootstrap endpoint.

### Efficient catalog endpoint

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/catalog/bootstrap?county=kisumu` | **One call** for listings (rental+bnb), stations, Mama Fua tasks, plans — use on app cold start |

---

## Test all endpoints (console output)

```bash
npm run dev          # terminal 1
npm run walkthrough  # terminal 2 — prints JSON for every call
```

Against production:

```bash
SMOKE_BASE_URL=https://your-app.vercel.app npm run walkthrough
```

**Verified flows:** health · services · listings browse/nearby/detail (gated) · subscription plans · laundry stations · Mama Fua tasks · **email signup/signin** · profile · FUA estimate/create/list/detail · Mama Fua estimate · feedback · admin queue/users.

Quick smoke (OTP/dev): `npm run smoke`

---

## Frontend: sign up & sign in

**Primary for Expo v1 — email + password.** Full spec: [docs/FRONTEND_AUTH.md](./docs/FRONTEND_AUTH.md)

### Sign up

```
POST /api/v1/auth/email/signup
{
  "email": "jane@example.com",
  "password": "SecurePass1",   // min 8 chars
  "name": "Jane Wanjiku",
  "county": "kisumu",          // optional
  "phone": "712345678"         // optional — auto-generated if omitted
}
→ 201 { token, user, isNewUser: true }
```

### Sign in

```
POST /api/v1/auth/email/signin
{ "email": "jane@example.com", "password": "SecurePass1" }
→ 200 { token, user }
```

Store `token` in `expo-secure-store`. Send `Authorization: Bearer <token>` on all protected routes.

### Frontend rule (Expo / mobile app)

**The backend never trusts `userId` from the request body.** Identity always comes from the JWT.

1. **After login** — persist the token and cache `user.id` for local UI only.
2. **Every protected call** — send `Authorization: Bearer <token>`.
3. **Never** send `userId` in JSON bodies for FUA orders, feedback, or profile — the server sets it from the token.
4. **On 401** — clear stored token and redirect to sign-in.
5. **Listing detail** — send the JWT when the user is signed in (unlock check); browse can stay anonymous.

```typescript
import * as SecureStore from "expo-secure-store";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL!;

// ── After sign up / sign in ──────────────────────────────────────
const { token, user } = await signInOrSignUp();
await SecureStore.setItemAsync("juax_token", token);
// user.id → local state / profile header ONLY — do not POST it to the API

// ── Authenticated fetch helper ───────────────────────────────────
async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await SecureStore.getItemAsync("juax_token");
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    await SecureStore.deleteItemAsync("juax_token");
    throw new Error("Session expired — sign in again");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data as T;
}

// ── Examples ─────────────────────────────────────────────────────
// FUA order — no userId in body
await api("/api/v1/laundry/orders", {
  method: "POST",
  body: { pickupMode: "door", pickupAddress: "…", loadKg: 5, scheduleDate: "2026-07-10", scheduleBand: "morning" },
});

// Listing detail — optional token when signed in (same helper adds header automatically)
await api(`/api/v1/listings/${listingId}`);

// My orders — server returns only this user's rows
await api("/api/v1/laundry/orders");
```

| Call | Token required? | Send `userId` in body? |
|------|-----------------|------------------------|
| Browse listings | No | No |
| Listing detail | Optional (recommended if signed in) | No |
| FUA estimate / create / list | **Yes** | **No** |
| Feedback (FUA/BnB/rental) | **Yes** | **No** — use `orderId` only |
| Profile | **Yes** | No |

See [Identity & user tracking](#identity--user-tracking) for the full DB mapping.

### Profile (after login)

| Method | Path |
|--------|------|
| GET | `/api/v1/me` |
| GET | `/api/v1/me/profile` — includes order/feedback stats |
| PATCH | `/api/v1/me/profile` — `{ displayName?, email?, county?, bio?, avatarUrl? }` |

### Phone OTP (later)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/auth/signup/send` + `signup/verify` | New user via phone |
| `POST /api/v1/auth/signin/send` + `signin/verify` | Existing user via phone |
| `POST /api/v1/auth/dev/login` | Web console only — `{ role: "admin"\|"agent"\|"user" }` |

When `OTP_DEV_MODE=true`, OTP send responses include `devCode` for on-screen entry.

---

## Frontend: data endpoints

### Listings (“requesting a view”)

There is no separate view-request endpoint. **Viewing a listing = `GET /api/v1/listings/{id}`.**

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/v1/listings?county=kisumu&type=rental\|bnb` | — | Browse |
| GET | `/api/v1/listings/nearby?lat=&lng=&radiusKm=` | — | Map |
| GET | `/api/v1/listings/{id}` | optional JWT | `locationLocked: true` until subscription/booking |

### Jua Fua

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/laundry/stations` | — |
| GET | `/api/v1/laundry/mamafua/tasks` | — |
| POST | `/api/v1/laundry/orders/estimate` | JWT |
| POST | `/api/v1/laundry/orders` | JWT |
| GET | `/api/v1/laundry/orders` | JWT |
| GET | `/api/v1/laundry/orders/{id}` | JWT |

### Feedback

```
POST /api/v1/feedback  { service, category, rating, body, orderId? }
```

See [docs/EXPO_API.md](./docs/EXPO_API.md) for full request bodies.

---

## Auth endpoints (full list)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/auth/email/signup` | **Email + password sign up → JWT** |
| `POST /api/v1/auth/email/signin` | **Email + password sign in → JWT** |
| `GET /api/v1/auth/check-phone` | Phone registered? |
| `POST /api/v1/auth/signin/send` | OTP sign in — step 1 |
| `POST /api/v1/auth/signin/verify` | OTP sign in — step 2 |
| `POST /api/v1/auth/signup/send` | OTP sign up — step 1 |
| `POST /api/v1/auth/signup/verify` | OTP sign up — step 2 |
| `POST /api/v1/auth/dev/login` | Web dev one-click (admin/agent/user) |
| `GET /api/v1/me` | Current user |
| `GET\|PATCH /api/v1/me/profile` | Profile + stats |

---

## Migrations

| File | Contents |
|------|----------|
| `001_initial_schema.sql` | Core schema |
| `002_mamafua_service.sql` | Mama Fua pickup mode + tasks |
| `003_laundry_tracking.sql` | Tracking events |
| `004_profiles_feedback.sql` | Profile fields, feedback |
| `005_listing_images.sql` | Cover + gallery URLs |
| `006_password_auth.sql` | `password_hash` for email login |

Apply on Aiven:

```bash
node scripts/apply-sql.mjs database/migrations/006_password_auth.sql
npx prisma generate
```

---

## Not done yet

| Item | Priority |
|------|----------|
| Expo app wiring to email auth + listings + FUA | High |
| M-Pesa STK + webhooks | High |
| `POST /subscriptions`, BnB booking unlock | High |
| SMS OTP provider | Medium |
| Listing image upload (S3/Cloudinary) | Low |

---

## Next steps for frontend team

1. Set `EXPO_PUBLIC_API_BASE_URL`
2. Implement email sign up / sign in ([FRONTEND_AUTH.md](./docs/FRONTEND_AUTH.md))
3. Wire listings browse + detail (handle `locationLocked`)
4. FUA estimate → create order → Trips tab
5. Feedback after completed order

See also: [FRONTEND_INTEGRATION.md](./docs/FRONTEND_INTEGRATION.md) · [VERCEL_DEPLOY.md](./docs/VERCEL_DEPLOY.md) · [OVERVIEW.md](./OVERVIEW.md)

---

## Identity & user tracking

Every authenticated request is tied to a **user UUID** in the database. The frontend never sends `userId` in the body for owned resources — the server reads it from the JWT.

### How auth works

```
1. Sign up / sign in → receive JWT
2. JWT payload: { sub: "<user-uuid>", role: "user"|"agent"|"admin", phone: "+254…" }
3. Every protected call:  Authorization: Bearer <token>
4. Server: verify JWT → load user from DB by sub → use user.id on all writes
```

| Step | Code |
|------|------|
| Token issued | `signAccessToken({ sub: user.id, role, phone })` |
| Token verified | `requireAuth()` → `getUserById(claims.sub)` |
| User in responses | `{ id, phone, email, displayName, role, … }` |

See [Frontend rule (Expo / mobile app)](#frontend-rule-expo--mobile-app) above for the full client contract.

### What is stored with `user_id` (confirmed in DB)

| Action | Endpoint | DB table | User link |
|--------|----------|----------|-----------|
| Sign up (email/OTP) | `POST …/signup` | `users` | New row, returns `user.id` |
| FUA order create | `POST /laundry/orders` | `laundry_orders.user_id` | **Required JWT** — order owned by caller |
| FUA status history | (on order create) | `laundry_status_events.created_by` | Customer UUID |
| FUA tracking timeline | (on order create) | `laundry_tracking_events.created_by` | Customer UUID on `order_placed` |
| FUA list / detail | `GET /laundry/orders` | — | **Filtered by `user_id`** — users only see their orders |
| Feedback (FUA/BnB/rental) | `POST /feedback` | `service_feedback.user_id` | **Required JWT** for service feedback |
| Feedback (general/app) | `POST /feedback` | `service_feedback.user_id` | Optional — anonymous allowed |
| Profile + stats | `GET /me/profile` | — | Counts orders/bookings/feedback **for this user** |
| Agent listing create | `POST /agent/listings` | `listings.agent_id` | Agent/admin JWT → `user.id` |
| Agent listing list | `GET /agent/listings` | — | **Filtered by `agent_id = user.id`** |
| Subscription (Phase 2b) | `POST /subscriptions` | `subscriptions.user_id` | Schema ready, endpoint pending |
| BnB booking (Phase 2b) | `POST /bnb/bookings` | `bnb_bookings.user_id` | Schema ready, endpoint pending |
| Listing location unlock | `GET /listings/{id}` + JWT | — | Uses `user.id` to check active subscription / confirmed booking |

### Listing views — what is and isn’t logged

| Behaviour | Tracked? | Notes |
|-----------|----------|-------|
| Browse listings (`GET /listings`) | No per-user log | Public read; no analytics row |
| View listing detail (`GET /listings/{id}`) | **No view table yet** | Optional JWT only affects **location unlock**, not a view audit |
| Unlock exact address | Indirect | Requires `subscriptions` or `bnb_bookings` linked to `user_id` (Phase 2b) |

**For the app today:** send the JWT on listing detail if the user is signed in — unlock logic uses their `user.id`. Anonymous browse works without a token but stays gated (`locationLocked: true`).

**Not built yet:** `listing_views` analytics table (who viewed which listing when). Add in a later phase if product needs it.

### Admin visibility

| Admin endpoint | Sees user identity |
|----------------|-------------------|
| `GET /admin/laundry/orders` | Customer `phone`, `displayName` on each order |
| `GET /admin/users` | All users with `id`, phone, role, `lastLoginAt` |
| `GET /admin/feedback` | Feedback linked to `user_id` when submitted signed-in |

### Example: FUA order (frontend)

```http
POST /api/v1/laundry/orders
Authorization: Bearer eyJ…
Content-Type: application/json

{
  "pickupMode": "door",
  "pickupAddress": "Nyamasaria Rd",
  "pickupLat": -0.108,
  "pickupLng": 34.763,
  "pickupCounty": "kisumu",
  "loadKg": 5,
  "scheduleDate": "2026-07-10",
  "scheduleBand": "morning"
}
```

Server creates row with `laundry_orders.user_id = <from JWT sub>`. Response includes order `id` for Trips tab and feedback.

### Example: listing detail with unlock check

```http
GET /api/v1/listings/{listingId}
Authorization: Bearer eyJ…   ← optional but recommended when signed in
```

Server loads `user.id` from token → checks subscriptions/bookings for that user → returns gated or full location fields.

### Errors when token missing or wrong

| Code | HTTP | When |
|------|------|------|
| `unauthorized` | 401 | No/invalid token on protected route |
| `forbidden` | 403 | Valid token but wrong role (e.g. user hitting admin) |
| `not_found` | 404 | Order/feedback `orderId` not owned by this user |

---

## Expo checklist (auth + tracking)

- [ ] After login, persist `token` and `user.id` from response
- [ ] Attach `Authorization: Bearer ${token}` to FUA, feedback, profile, listing detail (when signed in)
- [ ] Trips tab: `GET /laundry/orders` — returns only **this user's** orders
- [ ] Do not send `userId` in request bodies — server derives from JWT
- [ ] On 401, clear token and redirect to sign-in

