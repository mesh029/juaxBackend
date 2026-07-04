# Backend roadmap & KPIs

**Scope:** Next.js API (`src/app/api`) · PostgreSQL (Aiven) · Vercel  
**Consumer:** [`my-expo-app`](../my-expo-app) (wired in later phases)

Update checkboxes here and in [`README.md`](../README.md) as you ship.

---

## North-star KPIs (backend MVP)

| KPI | Target | How to verify |
|-----|--------|---------------|
| **DB connectivity** | 100% health checks pass when Aiven is up | `GET /api/health` locally + Vercel |
| **Location gate** | 0 leaks of `exact_address`, `exact_lat/lng`, `host_phone` on public/unauthorized calls | `curl` tests + integration script |
| **Auth** | OTP verify ≥ 95% success (excl. wrong code) | Log `verify` outcomes |
| **Read latency** | p95 &lt; 800 ms on Vercel for `GET /listings`, `GET /laundry/stations` | Vercel logs / manual timing |
| **Order integrity** | FUA total always computed server-side | Unit test pricing function |
| **Payment idempotency** | Duplicate M-Pesa callbacks never double-apply | Webhook integration test |
| **Role enforcement** | 100% of agent/admin routes return 403 for `user` role | Auth middleware tests |
| **Secrets** | 0 committed connection strings | `git grep postgres://` empty |

---

## Build order

```
Phase 0 → 1 → 2 → 4 → 5 → 2b → 3 → 6 → 7 → 8
 infra   auth  read  FUA   admin  keja $  agent  mpesa  ops  rides
```

- **Phase 2 (read)** before paywall — listings work immediately for Expo integration  
- **Phase 4 (FUA)** before subscriptions — simpler order loop, proves admin path  
- **Phase 3 (agent)** can parallelize once auth exists  

---

## Phase 0 — Foundation

**Goal:** Aiven live, API talks to DB, deployable on Vercel.

### Tasks

- [x] Schema `database/migrations/001_initial_schema.sql`
- [x] Seed `database/seed/001_pilot_seed.sql`
- [x] Next.js scaffold + `GET /api/health`
- [x] `GET /api/v1/services`, `/listings`, `/laundry/stations`
- [ ] Copy `.env.example` → `.env`
- [ ] Rotate Aiven password if exposed
- [ ] Run migrations + seed on Aiven
- [ ] `npm install && npm run build`
- [ ] Deploy to Vercel with `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`

### KPIs

| KPI | Pass |
|-----|------|
| `GET /api/health` → `{ status: "ok", db: "connected" }` | ✅ |
| `GET /api/v1/listings?county=kisumu` → ≥ 3 published rows | ✅ |
| `GET /api/v1/laundry/stations` → ≥ 3 active stations | ✅ |
| Vercel preview returns same health response | ☐ |
| No secrets in git | ✅ |

---

## Phase 1 — Auth & roles

**Goal:** +254 OTP → JWT. All protected routes use middleware.

### Endpoints

| Method | Path | Status |
|--------|------|--------|
| POST | `/api/v1/auth/otp/send` | ✅ |
| POST | `/api/v1/auth/otp/verify` | ✅ |
| GET | `/api/v1/me` | ✅ |

### Implementation notes

- `src/lib/auth/jwt.ts` — sign/verify with `JWT_SECRET`
- `src/lib/auth/otp.ts` — hash code in `otp_sessions`, 5 min TTL
- `src/lib/auth/middleware.ts` — `requireAuth`, `requireRole('agent'|'admin')`
- Dev: log OTP to console when `NODE_ENV=development`
- Rate limit: max 3 sends / phone / 15 min (DB count for MVP)

### KPIs

| KPI | Pass |
|-----|------|
| New phone → verify → JWT with `sub`, `role: user` | ✅ |
| Seeded `+254700000001` → `admin`, `+254700000002` → `agent` | ✅ |
| Expired / wrong OTP → 401 | ✅ |
| `GET /me` without token → 401 | ✅ |
| `GET /me` with valid token → phone + display_name | ✅ |

---

## Phase 2 — Saka Keja (public read)

**Goal:** Safe public listing API. Location gate stub ready for Phase 2b.

### Endpoints

| Method | Path | Status |
|--------|------|--------|
| GET | `/api/v1/listings` | ✅ |
| GET | `/api/v1/listings/[id]` | ✅ |
| GET | `/api/v1/listings/nearby` | ✅ |
| GET | `/api/v1/subscriptions/plans` | ✅ |

### Implementation notes

- `src/lib/location-gate.ts` — `toPublicListing()`, `toUnlockedListing(ctx)`
- Public DTO never selects gated columns in SQL
- `nearby`: haversine on `approx_lat/lng`, radius from `app_settings.default_search_radius_km`
- Pagination: `?limit=50&offset=0`

### KPIs

| KPI | Pass |
|-----|------|
| Public `GET /listings/[id]` response has no `exactAddress`, `hostPhone` | ✅ |
| `?type=rental` returns only vacant rentals | ✅ |
| `?type=bnb` excludes rentals | ✅ |
| Unpublished / archived listings → 404 | ✅ |
| `nearby` respects radius from settings | ✅ |

---

## Phase 2b — Saka Keja (subscribe + book + unlock)

**Goal:** Server enforces unlock rules. Expo cannot bypass.

### Endpoints

| Method | Path | Status |
|--------|------|--------|
| GET | `/api/v1/subscriptions/active` | ☐ |
| POST | `/api/v1/subscriptions` | ☐ |
| POST | `/api/v1/bnb/bookings` | ☐ |
| GET | `/api/v1/bnb/bookings` | ☐ |
| GET | `/api/v1/bnb/bookings/[id]` | ☐ |

### Location gate rules

| Type | Unlock when |
|------|-------------|
| `rental` | Active `subscriptions` row: `payment_status=success` AND `expires_at > now()` |
| `bnb` | `bnb_bookings` for user+listing: `status=confirmed` |

### KPIs

| KPI | Pass |
|-----|------|
| User without sub: rental detail → `locationLocked: true`, no exact fields | ☐ |
| User with active sub: rental detail → exact address + contact + pin | ☐ |
| User with confirmed BnB: full unlock on that listing only | ☐ |
| Expired subscription re-locks rental | ☐ |
| Booking `pending_payment` does not unlock BnB address | ☐ |

---

## Phase 3 — Saka Keja (agent)

**Goal:** Agents populate listings without DB access.

### Endpoints

| Method | Path | Status |
|--------|------|--------|
| GET | `/api/v1/agent/listings` | ☐ |
| POST | `/api/v1/agent/listings` | ☐ |
| PATCH | `/api/v1/agent/listings/[id]` | ☐ |
| POST | `/api/v1/agent/listings/[id]/publish` | ☐ |
| POST | `/api/v1/agent/listings/[id]/archive` | ☐ |
| PATCH | `/api/v1/agent/listings/[id]/vacant` | ☐ |

### KPIs

| KPI | Pass |
|-----|------|
| Agent creates draft → not in public `GET /listings` | ☐ |
| Publish → appears in public browse | ☐ |
| Agent cannot edit another agent's listing → 403 | ☐ |
| `user` role on agent routes → 403 | ☐ |
| Archive → 404 on public browse | ☐ |

---

## Phase 4 — Jua Fua (orders)

**Goal:** Users place laundry orders; pricing is server-authoritative.

### Endpoints

| Method | Path | Status |
|--------|------|--------|
| GET | `/api/v1/laundry/stations` | ✅ |
| POST | `/api/v1/laundry/orders/estimate` | ☐ |
| POST | `/api/v1/laundry/orders` | ☐ |
| GET | `/api/v1/laundry/orders` | ☐ |
| GET | `/api/v1/laundry/orders/[id]` | ☐ |

### Pricing (server)

```
total_kes = (load_kg * rate_per_kg) + pickup_fee_kes   // door mode
total_kes = load_kg * rate_per_kg                    // station mode (pickup_fee 0)
```

Defaults: `rate_per_kg=80`, `pickup_fee_kes=150` (store on order row at creation).

### KPIs

| KPI | Pass |
|-----|------|
| Estimate matches create total for same inputs | ☐ |
| Door order requires `pickup_address` | ☐ |
| Station order requires valid `station_id` | ☐ |
| Order creates `laundry_status_events` row `requested` | ☐ |
| User sees only own orders on `GET /laundry/orders` | ☐ |

---

## Phase 5 — Jua Fua (admin)

**Goal:** Ops can run the laundry queue from API.

### Endpoints

| Method | Path | Status |
|--------|------|--------|
| GET | `/api/v1/admin/laundry/orders` | ☐ |
| PATCH | `/api/v1/admin/laundry/orders/[id]/status` | ☐ |
| POST | `/api/v1/admin/laundry/orders/[id]/notes` | ☐ |

### KPIs

| KPI | Pass |
|-----|------|
| `?status=requested` filters queue | ☐ |
| Status transition writes `laundry_status_events` | ☐ |
| Invalid status jump rejected (e.g. `requested` → `delivered`) | ☐ |
| Non-admin → 403 | ☐ |

---

## Phase 6 — M-Pesa (Daraja)

**Goal:** STK Push + webhook unlocks subscriptions, BnB, FUA.

### Endpoints

| Method | Path | Status |
|--------|------|--------|
| POST | `/api/v1/webhooks/mpesa` | ☐ |
| STK initiate (on subscription/booking/order create) | ☐ |

### KPIs

| KPI | Pass |
|-----|------|
| Sandbox STK success → `payment_status=success` | ☐ |
| Duplicate callback → idempotent (no double unlock) | ☐ |
| Failed/cancelled STK → `payment_status=failed`, no unlock | ☐ |
| `MPESA_*` env vars only on Vercel, never in client | ☐ |
| Callback URL uses public Vercel domain | ☐ |

---

## Phase 7 — Admin & ops

**Goal:** Settings and user management without SQL.

### Endpoints

| Method | Path | Status |
|--------|------|--------|
| GET | `/api/v1/admin/settings` | ☐ |
| PATCH | `/api/v1/admin/settings` | ☐ |
| GET | `/api/v1/admin/users` | ☐ |
| POST | `/api/v1/admin/users/[id]/promote-agent` | ☐ |

### KPIs

| KPI | Pass |
|-----|------|
| `rides_enabled` toggle reflected in `GET /api/v1/services` | ☐ |
| `kisumu_only_listings` filters public browse | ☐ |
| Promote user → agent can access agent routes | ☐ |

---

## Phase 8 — Rides (coming soon)

**Goal:** Flag off; capture interest only.

### Endpoints

| Method | Path | Status |
|--------|------|--------|
| GET | `/api/v1/services` | ✅ |
| POST | `/api/v1/rides/interest` | ☐ |

### KPIs

| KPI | Pass |
|-----|------|
| `rides.enabled === false` in services response | ☐ |
| Interest row stored in `rides_coming_soon` | ☐ |

---

## Phase 9 — Hardening

| Area | Task | KPI |
|------|------|-----|
| Connections | Aiven connection pooler URL on Vercel | No `too many connections` under load |
| Errors | Consistent `{ error, message }` shape | All 4xx/5xx match schema |
| Validation | Zod on all POST/PATCH bodies | Invalid body → 400 with field errors |
| Logging | Structured JSON logs on Vercel | Request id traceable |
| Tests | `npm test` for location-gate + pricing | CI green |

---

## Backlog (post-MVP)

| Item | Notes |
|------|-------|
| **Images** | `listing_images` migration + upload route |
| **3D tours** | `listing_tours` + gate in LocationGate |
| **Agent UI** | Next.js pages under `/agent` on same Vercel project |
| **Admin UI** | Next.js pages under `/admin` |
| **Redis** | OTP + rate limits at scale |

---

## Definition of done (each phase)

1. All phase KPI checkboxes pass  
2. Routes documented in [`API_OUTLINE.md`](./API_OUTLINE.md)  
3. `npm run build` succeeds  
4. Tested against Aiven (not mocks)  
5. README phase section updated  

---

## Current status

| Phase | Progress |
|-------|----------|
| 0 Foundation | ~90% — Aiven live, tests pass; Vercel deploy pending |
| 1 Auth | **Done** — OTP + JWT + `/me` |
| 2 Keja read | **Done** — gate, nearby, subscription plans |
| 2b Keja unlock | 0% |
| 3 Agent | 0% |
| 4 FUA orders | ~20% — stations only |
| 5 FUA admin | 0% |
| 6 M-Pesa | 0% |
| 7 Admin ops | 0% |
| 8 Rides | ~50% — services flag only |

**Next up:** Phase 4 — FUA order estimate/create/track, then Phase 2b subscribe + book unlock.
