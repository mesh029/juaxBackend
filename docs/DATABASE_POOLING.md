# Aiven connection pooling on free / hobby plans

Aiven shows:

> Connection pools are only available for **Startup plans and higher**.

If you deploy the API to **Vercel serverless** with a **direct** Aiven URL, each function opens DB connections and you will hit:

`Too many database connections opened / remaining connection slots are reserved`

You need an external pooler or a non-serverless host — **unless** traffic is low enough to stay within Aiven’s ~20 connection cap (see Option 0).

---

## Option 0 — Vercel + direct Aiven (stay within ~20 connections)

For **MVP / pilot traffic**, you can keep Vercel and a **direct** Aiven URL if connections are managed correctly.

### Required in code (already in this repo)

1. **One Prisma client** — `src/lib/db.ts` / `src/lib/prisma.ts`; never `new PrismaClient()` in routes
2. **globalThis singleton in production** — not dev-only (dev-only is a common Vercel bug)
3. **`connection_limit=1`** per serverless instance (auto when `VERCEL` is set)

```typescript
import { prisma } from "@/lib/prisma";
```

### Vercel env

```env
DATABASE_URL=postgres://…direct aiven…?sslmode=require
DIRECT_URL=postgres://…same…?sslmode=require
PRISMA_CONNECTION_LIMIT=1
JWT_SECRET=…
```

### The math

| Item | Value |
|------|--------|
| Aiven hobby limit | ~20 connections |
| Reserved for superuser | ~2 |
| Usable | ~18 |
| Per warm Vercel function | 1 (with `connection_limit=1`) |
| Max concurrent warm instances | ~18 before errors |

This works for low traffic. **Bursts** (many parallel API calls, health checks, crawlers, or cold-start storms) can still exhaust the pool.

If errors persist after redeploy → use **Option A (Accelerate)** or **Option B (Render/Railway)** below.

---

## Option A — Prisma Accelerate (recommended, free tier)

Works with your **existing Aiven database**. No Aiven upgrade required.

1. Go to [console.prisma.io](https://console.prisma.io) → sign up (free)
2. **New project** → **Enable Accelerate** → paste your **direct Aiven** connection string
3. Copy the **Accelerate connection string** (`prisma://accelerate…` or `prisma+postgres://…`)

**Vercel environment variables:**

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Accelerate URL from Prisma console |
| `DIRECT_URL` | Your direct Aiven URL (`postgres://…?sslmode=require`) |

**Local `.env`:**

```env
DATABASE_URL=postgres://…direct aiven…?sslmode=require
DIRECT_URL=postgres://…same direct aiven…?sslmode=require
```

Local dev uses direct Aiven (one process — no pooler needed). Vercel uses Accelerate for pooling.

4. Redeploy Vercel
5. Migrations still run from your machine against `DIRECT_URL`:

```bash
DIRECT_URL="postgres://…" npx prisma db push   # or npm run migrate scripts
```

Free tier: ~**60,000 queries/month** — enough for MVP / pilot.

The repo already includes `@prisma/extension-accelerate`; when `DATABASE_URL` starts with `prisma://`, pooling is enabled automatically.

---

## Option B — Host on Render or Railway (not Vercel)

Run the API as a **single long-running Node process** instead of many serverless functions.

| Host | Free tier | DB URL |
|------|-----------|--------|
| [Render](https://render.com) | Web service | Direct Aiven URL |
| [Railway](https://railway.app) | Limited free | Direct Aiven URL |

```env
DATABASE_URL=postgres://…direct aiven…?sslmode=require
DIRECT_URL=postgres://…same…?sslmode=require
PRISMA_CONNECTION_LIMIT=3
```

One process ≈ 1–3 connections total. No pooler required for low traffic.

Build command: `npm install && npm run build`  
Start command: `npm start`

Point Expo at `https://your-app.onrender.com` instead of Vercel.

---

## Option C — Upgrade Aiven to Startup+

Aiven console → enable **Connection pool** → use pooler URL on Vercel:

```env
DATABASE_URL=<Aiven pooler URL>?sslmode=require
DIRECT_URL=<Aiven direct URL>?sslmode=require
DATABASE_USE_PGBOUNCER=true
PRISMA_CONNECTION_LIMIT=1
```

---

## Option D — Migrate DB to Neon (free pooling built-in)

[Neon](https://neon.tech) includes connection pooling on the free tier (pooler on port 6543).

Requires migrating data from Aiven → Neon and updating `DATABASE_URL`. More work, but no paid add-ons.

---

## Comparison

| Option | Cost | Keep Aiven? | Keep Vercel? |
|--------|------|-------------|--------------|
| **A — Prisma Accelerate** | Free tier | Yes | Yes |
| **B — Render/Railway** | Free tier | Yes | No |
| **C — Aiven Startup+** | Paid Aiven | Yes | Yes |
| **D — Neon** | Free | No | Yes |

**For most pilots:** use **Option A (Prisma Accelerate)** — smallest change, stays on Vercel + Aiven.

---

## After fixing

```bash
curl https://YOUR-APP.vercel.app/api/health
curl https://YOUR-APP.vercel.app/api/v1/laundry/stations
```

Both should return `200` with `"db": "connected"`.
