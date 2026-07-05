# Connection budget & API efficiency

**Read this before adding API routes, mobile data hooks, or scripts that hit production.**

We deploy on **Vercel serverless** + **Aiven PostgreSQL** (~20 connections on hobby). Each concurrent HTTP request can spawn a separate function, and each function holds at least one DB connection. Connection exhaustion is a **capacity** problem, not always a code bug — but bad client patterns make it guaranteed.

Related: [DATABASE_POOLING.md](./DATABASE_POOLING.md) (Accelerate, Render, Aiven pooler fallbacks).

---

## Golden rules

### Backend

1. **One Prisma client** — import `{ prisma }` from `@/lib/db` or `@/lib/prisma`. Never `new PrismaClient()` outside `src/lib/db.ts`.
2. **Batch on the server** — if a screen needs N public resources, add **one** endpoint that returns them (see `/api/v1/catalog/bootstrap`). Do not force clients to fan out.
3. **`Promise.all` inside a route is OK** — one lambda, one connection. **`Promise.all` from the client** across many routes is not OK under load.
4. **Health checks** — `/api/health` runs `SELECT 1`. Do not poll it from clients; use it for deploy probes only.
5. **Scripts** — `migrate.mjs`, `seed.mjs`, `apply-sql.mjs` use `pg` directly and must call `pool.end()`. Never run them against prod while the app is under traffic.

### Frontend (Expo, web console, any client)

1. **Prefer bootstrap endpoints** over many parallel GETs on app open.
2. **Avoid `Promise.all` across API paths** on cold start or pull-to-refresh unless each call is user-initiated.
3. **One auth call on boot** — validate session with `GET /api/v1/me`; load full profile only when the profile screen opens.
4. **No per-county fan-out** — backend pilot is Kisumu-only; do not request 4 counties in parallel.
5. **Debounce / cache** — do not refetch catalog data on every navigation or map pan.

### Before merging

Run these greps:

```bash
# Must return only src/lib/db.ts
rg 'new PrismaClient' --glob '!docs/**'

# Review any client-side parallel API fan-out
rg 'Promise\.all' ../my-expo-app src/app
```

Ask: *“How many serverless functions does this user action spawn?”* If the answer is >3 on cold start, redesign.

---

## The budget (Vercel + direct Aiven)

| Item | Value |
|------|--------|
| Aiven hobby limit | ~20 connections |
| Usable (after superuser reserve) | ~18 |
| Per warm Vercel function (`PRISMA_CONNECTION_LIMIT=1`) | 1 |
| Safe concurrent warm functions | ~18 |

**Example — bad (fixed 2026-07):**

```
Expo app open → 8 parallel listing calls (4 counties × 2 types)
              + 3 catalog calls + 2 auth calls + 1 orders
              ≈ 14 serverless functions ≈ 14 DB connections
```

**Example — good:**

```
Expo app open → GET /api/v1/catalog/bootstrap  (1 function, 1 connection)
              + GET /api/v1/me if token exists (1 function)
              ≈ 2 connections
```

---

## Efficient endpoints

### `GET /api/v1/catalog/bootstrap`

**Purpose:** Single payload for app cold start (listings, stations, Mama Fua tasks, subscription plans).

| Query | Default | Notes |
|-------|---------|--------|
| `county` | `kisumu` | Ignored when `kisumu_only_listings` setting is true |

**Response shape:**

```json
{
  "county": "kisumu",
  "kisumuOnly": true,
  "listings": { "rental": [], "bnb": [] },
  "laundryStations": [],
  "mamaFua": { "dispatchFeeKes": 600, "description": "…", "tasks": [] },
  "subscriptionPlans": []
}
```

**Use when:** Expo/web home screen loads, pull-to-refresh of public catalog.

**Do not replace:** authenticated routes (`/me/profile`, `/laundry/orders`), listing detail, admin APIs.

### Existing granular routes

Keep these for filters, pagination, and admin — but **not** for initial app bootstrap:

- `GET /api/v1/listings?county=&type=`
- `GET /api/v1/laundry/stations`
- `GET /api/v1/laundry/mamafua/tasks`
- `GET /api/v1/subscriptions/plans`

---

## Adding new features

| Scenario | Do this |
|----------|---------|
| New home-screen widget needs 2+ public API resources | Extend `catalog/bootstrap` or add a scoped `catalog/*` bundle |
| New authenticated dashboard section | One endpoint per screen is fine; avoid loading all sections at once |
| New county / region support | One `county` param or bootstrap call — never loop counties client-side |
| Background sync / polling | Max 1 request per interval; never poll `/api/health` |
| Load testing | Use `npm run walkthrough` locally; avoid hammering production Vercel |

---

## Vercel environment (direct Aiven)

```env
DATABASE_URL=postgres://…?sslmode=require
DIRECT_URL=postgres://…?sslmode=require
PRISMA_CONNECTION_LIMIT=1
```

Redeploy after env changes.

---

## When this is not enough

If connection errors persist with bootstrap + singleton + `connection_limit=1`:

1. [Prisma Accelerate](https://console.prisma.io) (free tier) — stay on Vercel  
2. Aiven Startup+ connection pooler  
3. Render/Railway single Node process  

See [DATABASE_POOLING.md](./DATABASE_POOLING.md).

---

## Code references

| What | Where |
|------|--------|
| Prisma singleton | `src/lib/db.ts` |
| Bootstrap builder | `src/lib/catalog/bootstrap.ts` |
| Bootstrap route | `src/app/api/v1/catalog/bootstrap/route.ts` |
| Expo catalog hook | `apps/my-expo-app/hooks/useAppData.ts` |
| Expo API client | `apps/my-expo-app/lib/api.ts` → `fetchAppCatalog()` |
