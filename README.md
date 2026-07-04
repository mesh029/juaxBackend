# Jua X Backend

PostgreSQL (Aiven) + **Next.js 14** API for the Jua X super-app.

**Start here:** [`OVERVIEW.md`](./OVERVIEW.md) — product summary, backend goals, current status  
**Build tracker:** [`docs/ROADMAP.md`](./docs/ROADMAP.md) — phases & KPIs

**MVP scope:** Jua Fua (laundry) + Saka Keja (BnB + rentals). **Rides = coming soon** (flag only).

Mobile app: [`../my-expo-app`](../my-expo-app)

---

## Stack

| Layer | Choice |
|-------|--------|
| Database | PostgreSQL 16 on [Aiven](https://aiven.io) (`sslmode=require`) |
| ORM | [Prisma 5](https://www.prisma.io) — `prisma/schema.prisma`, client via `src/lib/db.ts` |
| API | Next.js 14 App Router (`src/app/api`) |
| Hosting | [Vercel](https://vercel.com) (Git push deploy) |
| DB client | `pg` (node-postgres) |
| Auth | +254 phone OTP → JWT (M-Pesa Daraja in Phase 6) |

---

## Who does what

```
┌─────────────┐     REST API      ┌──────────────────┐
│  Expo app   │ ◄──────────────► │  Next.js API     │
│  (users)    │                   │  + PostgreSQL    │
└─────────────┘                   └────────┬─────────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              ▼                            ▼                            ▼
       ┌─────────────┐            ┌─────────────┐              ┌─────────────┐
       │   Agents    │            │    Admin    │              │   Aiven     │
       │  (listings) │            │ FUA monitor │              │  Postgres   │
       └─────────────┘            └─────────────┘              └─────────────┘
```

| Actor | Role | MVP capabilities |
|-------|------|------------------|
| **User** | `user` | OTP login · browse keja (area only) · subscribe · book BnB · request FUA |
| **Agent** | `agent` | CRUD listings (text props) · publish BnB/rentals · mark vacant |
| **Admin** | `admin` | Monitor FUA orders · update status · app toggles · manage agents |

### Saka Keja location rules (from product spec)

| Data | Free browse | BnB after M-Pesa book | Rental + active subscription |
|------|-------------|----------------------|------------------------------|
| Title, price, beds, amenities | Yes | Yes | Yes |
| Neighborhood (e.g. Nyamasaria) | Yes | Yes | Yes |
| Approximate map pin | Yes | Yes | Yes |
| Exact address / GPS / contact | **No** | **Yes** | **Yes** |

Subscriptions: **daily** · **weekly** · **monthly** — unlock rental locations only (BnB uses book-to-reveal).

---

## Phase tracker

Full KPIs per phase: **[`docs/ROADMAP.md`](./docs/ROADMAP.md)**

Update checkboxes as you ship. **Do not skip Phase 0.**

### Phase 0 — Foundation
- [x] Repo folder + `.gitignore` (no secrets on GitHub)
- [x] `.env.example` template
- [x] SQL schema `database/migrations/001_initial_schema.sql`
- [x] Architecture + data model docs
- [x] Next.js API scaffold (`src/app/api`)
- [x] Copy `.env.example` → `.env` locally (never commit)
- [ ] **Rotate Aiven password** if it was ever pasted in chat
- [x] Run migration against Aiven (`npm run migrate`)
- [x] `npm run dev` connects without error
- [x] `npm run build` succeeds
- [x] `npm test` passes (29 tests)

### Phase 1 — Auth & roles
- [x] `POST /api/v1/auth/otp/send` (+254, rate-limited)
- [x] `POST /api/v1/auth/otp/verify` → JWT
- [x] `GET /api/v1/me` profile
- [x] Role claims: `user` | `agent` | `admin`
- [x] Seed one admin + one agent user

### Phase 2 — Saka Keja (public + user)
- [x] `GET /api/v1/listings` — published only, county/type filter, pagination
- [x] `GET /api/v1/listings/[id]` — **public DTO** (no exact address/contact/GPS)
- [x] `GET /api/v1/listings/nearby` — haversine radius from `app_settings`
- [x] `GET /api/v1/subscriptions/plans` — daily / weekly / monthly KES
- [x] Location gate enforced in API (`src/lib/location-gate.ts`)
- [ ] `POST /api/v1/subscriptions` — pick plan, pending M-Pesa
- [ ] `POST /api/v1/subscriptions/callback` — Daraja webhook
- [ ] `GET /api/v1/subscriptions/active` — unlock check
- [ ] `POST /api/v1/bnb/bookings` + payment flow
- [ ] `GET /api/v1/bnb/bookings/[id]` — full address after `confirmed`

### Phase 3 — Saka Keja (agent)
- [ ] `POST /api/v1/agent/listings` — create draft (text fields)
- [ ] `PATCH /api/v1/agent/listings/[id]` — edit
- [ ] `POST /api/v1/agent/listings/[id]/publish`
- [ ] `POST /api/v1/agent/listings/[id]/archive`
- [ ] Rental: `vacant` toggle
- [ ] Agent sees own listings only

### Phase 4 — Jua Fua
- [x] Seed `laundry_stations` (Nairobi + Kisumu pilot)
- [x] `GET /api/v1/laundry/stations` — active stations for map
- [ ] `POST /api/v1/laundry/orders` — door | station, kg, schedule band
- [ ] KES estimate server-side (`rate_per_kg`, `pickup_fee`)
- [ ] `GET /api/v1/laundry/orders` — user history
- [ ] Status stepper events

### Phase 5 — Jua Fua (admin)
- [ ] `GET /api/v1/admin/laundry/orders` — queue filter by status
- [ ] `PATCH /api/v1/admin/laundry/orders/[id]/status`
- [ ] `POST /api/v1/admin/laundry/orders/[id]/notes`
- [ ] SMS/WhatsApp notification hooks (stub)

### Phase 6 — Payments (M-Pesa)
- [ ] Daraja STK Push — subscriptions
- [ ] Daraja STK Push — BnB bookings
- [ ] Daraja STK Push — FUA orders
- [ ] Idempotent callback handler + receipt storage

### Phase 7 — Admin & ops
- [ ] `GET/PATCH /api/v1/admin/settings` — subscription gates, radius, Kisumu-only
- [ ] `GET /api/v1/admin/users` — search by phone
- [ ] Promote user → agent

### Phase 8 — Rides
- [x] `rides_enabled` stays `false` in `app_settings`
- [x] `GET /api/v1/services` — rides `coming soon`
- [ ] `POST /api/v1/rides/interest` — waitlist only
- [ ] App shows "Coming soon" segment

### Backlog (explicit TODOs)
- [ ] **Images** — `listing_images` table, S3/Cloudinary upload, agent UI
- [ ] **3D tours** — Matterport URL per listing, gate like photos
- [ ] Agent web dashboard (Next.js pages or Retool)
- [ ] Admin web dashboard
- [ ] Push notifications (Expo)
- [ ] Redis for OTP + rate limits

---

## Quick start

### 1. Secrets (local only)

```bash
cd backend
cp .env.example .env
# Edit .env — paste Aiven URL from Aiven console (NOT from git)
```

GitHub will **not** receive `.env` — it is in `.gitignore`.

### 2. Run database migration

```bash
# requires psql client
psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f database/seed/001_pilot_seed.sql
```

### 3. Run API + web console

```bash
cd backend
npm install
npm run migrate    # first time only — applies schema + seed to Aiven
npm run db:generate  # regenerate Prisma client after schema changes
npm run dev
# → http://localhost:5080  (ops console + API)
```

Optional: set `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env` for the explore map.

| Route | Purpose |
|-------|---------|
| `/` | Dashboard — stats, charts, latest listings |
| `/listings` | Browse Saka Keja inventory |
| `/explore` | Mapbox map + nearby API |
| `/admin` | Users & FUA queue (admin login) |
| `/labs` | Run API tests per roadmap phase |
| `/login` | OTP sign-in (`700000001` = admin in dev) |

API: `http://localhost:5080` · Health: `http://localhost:5080/api/health`

### 3b. Run tests

```bash
npm test           # 29 tests — unit + Aiven integration
```

### 4. Connect Expo app

**Local dev** (phone on same Wi‑Fi):

```env
# my-expo-app/.env.local
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:5080
```

**Production** (after Vercel deploy):

```env
EXPO_PUBLIC_API_BASE_URL=https://your-project.vercel.app
```

### 5. Deploy to Vercel

1. Push this `backend/` folder to GitHub (no `.env`).
2. Import the repo in [Vercel](https://vercel.com) → framework: **Next.js**.
3. Add environment variables in Vercel → **Settings → Environment Variables**:
   - `DATABASE_URL` — Aiven connection string
   - `JWT_SECRET` — random 32+ char string
   - `CORS_ORIGINS` — your Expo/web origins (comma-separated)
4. Deploy. API base: `https://<your-project>.vercel.app`

Migrations still run locally via `psql` against Aiven (not from Vercel build).

---

## Folder layout

```
backend/
├── README.md                 ← you are here (phase tracker)
├── .env.example
├── .gitignore
├── package.json
├── next.config.mjs
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   └── API_OUTLINE.md
├── database/
│   ├── migrations/
│   └── seed/
└── src/
    ├── app/
    │   ├── api/              ← Route handlers
    │   └── page.tsx          ← API index (dev)
    └── lib/
        ├── db.ts
        ├── cors.ts
        └── dto/
```

---

## Security checklist (before GitHub push)

- [ ] No `postgres://` URLs in any committed file
- [ ] `.env` is gitignored
- [ ] Aiven uses IP allowlist + strong password
- [ ] JWT secret is random (32+ chars)
- [ ] M-Pesa secrets server-only (never `EXPO_PUBLIC_*`)

---

## Related docs

- [**Overview**](./OVERVIEW.md) — product + backend mission + where we are
- [Roadmap & KPIs](./docs/ROADMAP.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Data model](./docs/DATA_MODEL.md)
- [API outline](./docs/API_OUTLINE.md)
- Mobile UI spec: [../my-expo-app/UI_SPECS.md](../my-expo-app/UI_SPECS.md)
