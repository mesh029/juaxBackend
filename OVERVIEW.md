# Jua X — Product & backend overview

One-page summary of what the mobile app does, what this API is for, and where we are today.

**Mobile app:** [`../my-expo-app`](../my-expo-app)  
**Detailed build plan:** [`docs/ROADMAP.md`](./docs/ROADMAP.md)

---

## What Jua X is

Jua X is a Kenya-focused **super-app** for everyday city life — laundry, short stays, rentals, and (later) rides — in a single Expo app. Pilot geography: **Kisumu first**, with Nairobi stations for laundry.

The app is a **high-fidelity UI prototype** today. Maps (Mapbox), sheets, booking flows, and onboarding are built. Listings, auth, orders, and payments still need to be wired to this backend.

---

## App capabilities (what users see)

### Home — three live services + one placeholder

| Service | Brand | What the user does |
|---------|-------|-------------------|
| **Jua Fua** | Laundry valet | Pick door pickup or a station on the map · set load (kg) · schedule · track order status |
| **Saka Keja — BnB** | Short stays | Browse stays · view details · book · pay · get exact address after confirmation |
| **Saka Keja — Rentals** | Long-term housing | Browse vacant units · see neighborhood + approximate pin · subscribe to unlock exact location & contact |
| **Rides** | Coming soon | Segment visible · no booking yet |

Users swipe between services on Home. Carousels and maps are interactive; data is still mostly hardcoded in the app until API integration.

### Other tabs

| Tab | Purpose |
|-----|---------|
| **Explore** | City discovery map — hotels, markets, journal content (demo data) |
| **Trips** | History of rides and service orders |
| **Inbox** | Messages (demo) |
| **Me** | Profile, theme, membership |

### Maps & location

- GPS + county detection via Mapbox geocoding  
- Unified home map switches between FUA / BnB / rental layers  
- **Privacy rule:** free users see **neighborhood + approximate pin only** — never exact address, GPS, or host contact until they pay or subscribe  

---

## What the backend must achieve

This folder is the **source of truth** for data, permissions, and payments. The Expo app is a client — it must not enforce business rules alone.

### Stack

| Piece | Choice |
|-------|--------|
| API | Next.js 14 route handlers (`src/app/api`) |
| Database | PostgreSQL on Aiven |
| ORM | **Prisma 5** (`prisma/schema.prisma`) — typed queries; raw SQL for geo |
| Deploy | Vercel (when ready) |
| Auth | +254 phone OTP → JWT |
| Payments | M-Pesa Daraja (planned) |

### Three actors

| Role | Who | Backend responsibility |
|------|-----|------------------------|
| **user** | App customer | Browse · book · subscribe · place FUA orders |
| **agent** | Field rep | Create and publish listings (text properties for now) |
| **admin** | Ops | Monitor FUA queue · update order status · app settings |

### Core business rules (non-negotiable)

**Saka Keja — location gate**

| Data | Free browse | BnB (after paid booking) | Rental (active subscription) |
|------|-------------|---------------------------|-------------------------------|
| Title, price, beds, amenities | ✓ | ✓ | ✓ |
| Neighborhood (e.g. Nyamasaria) | ✓ | ✓ | ✓ |
| Approximate map pin | ✓ | ✓ | ✓ |
| Exact address, GPS, host contact | ✗ | ✓ | ✓ |

- BnB: **book-to-reveal** after M-Pesa confirms  
- Rental: **daily / weekly / monthly** subscription unlocks location  
- Gate enforced in API responses — never trust the app  

**Jua Fua**

- Stations on map · door or station pickup · server-calculated KES total · status stepper (requested → delivered) · admin advances status  

**Rides**

- `rides_enabled: false` until product is ready · waitlist only  

### Explicitly later (backlog)

- Listing **images** (Cloudinary/S3)  
- **3D tours** (Matterport URLs)  
- Agent / admin web dashboards  
- Push notifications · Redis for OTP at scale  

---

## Where we are now

*Last updated: July 4, 2026 — see [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) for full progress (~72% MVP).*

### Done

| Area | Status |
|------|--------|
| Database schema + Kisumu pilot seed on Aiven | ✓ Live |
| Health check | `GET /api/health` |
| Service flags | `GET /api/v1/services` (rides = coming soon) |
| Listings (public) | `GET /api/v1/listings`, `GET /api/v1/listings/[id]` — location gate enforced |
| Listings (nearby) | `GET /api/v1/listings/nearby` — haversine radius from settings |
| Subscription plans | `GET /api/v1/subscriptions/plans` — daily / weekly / monthly KES |
| Laundry stations | `GET /api/v1/laundry/stations` |
| Auth | `POST /api/v1/auth/otp/send` · `verify` · `GET /api/v1/me` |
| Tests | 29 passing (`npm test`) — unit + live Aiven integration |
| Build | `npm run build` succeeds |
| Web console | Amber-minimal ops UI at `/` — listings, map, admin, API lab |

### Not done yet

| Area | Status |
|------|--------|
| Expo app wired to API | Not started — still uses hardcoded data |
| Location gate (subscriptions + BnB unlock) | Gate module + detail route ready; subscribe/book endpoints in Phase 2b |
| FUA order create / track / admin | Not built |
| Agent listing CRUD | Not built |
| M-Pesa payments | Not built |
| Vercel deploy | Waiting until local API is stable |
| Listing images & 3D | Backlog |

### Phase progress

See **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** for detailed percentages and API inventory.

```
Overall MVP     █████████████████░░░  ~72%
Phase 0–2       ██████████████████░░  ~90%
Phase 4–5 FUA   █████████████████░░░  ~88%
Phase 6 M-Pesa  ░░░░░░░░░░░░░░░░░░░░   0%
Expo wiring     █░░░░░░░░░░░░░░░░░░░   5%
```

### Seeded test accounts (Aiven)

| Phone | Role |
|-------|------|
| `+254700000001` | admin |
| `+254700000002` | agent |

Pilot listings: 3 published in Kisumu (Nyamasaria, Milimani, Dunga).  
Laundry stations: Westlands, CBD, Kisumu.

### Run locally

```bash
cd backend
cp .env.example .env    # add Aiven URL + JWT_SECRET
npm install
npm run migrate         # first time
npm run dev             # http://localhost:5080
npm test
```

Open **http://localhost:5080** for the ops console (listings, Mapbox explore, admin, API lab).
Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `.env` for the live map.

---

## What success looks like

1. **User** opens app → real Kisumu listings from API → books BnB or subscribes for rental location → places FUA order → sees status in Trips  
2. **Agent** publishes a new listing → appears in app without redeploy  
3. **Admin** moves FUA orders through the queue from API  
4. **No** exact rental location or host contact leaks without payment  
5. API on Vercel · app points at `EXPO_PUBLIC_API_BASE_URL`  

**Next build target:** Phase 4 — FUA order estimate/create/track, then Phase 2b subscribe + book unlock.
