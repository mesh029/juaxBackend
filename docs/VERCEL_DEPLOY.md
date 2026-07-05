# Deploy Jua X backend to Vercel

Step-by-step for pushing this repo to Vercel and pointing the Expo app at the live API.

---

## 1. Prerequisites

- GitHub repo pushed (e.g. `mesh029/juaxBackend`)
- [Aiven Postgres](https://aiven.io) running with migrations applied locally at least once
- [Vercel account](https://vercel.com) linked to GitHub

**Apply migrations before first deploy** (from your machine, with production `DATABASE_URL`):

```bash
cd apps/backend
cp .env.example .env   # fill DATABASE_URL
npm run migrate
npm run seed           # optional — pilot listings + test users
```

---

## 2. Import project on Vercel

1. [vercel.com/new](https://vercel.com/new) → Import Git repository  
2. Root directory: **`apps/backend`** (if monorepo) or repo root if backend-only  
3. Framework: **Next.js** (auto-detected)  
4. Build command: `npm run build` (default)  
5. Install command: `npm install` (runs `postinstall` → `prisma generate`)

Do **not** deploy until environment variables are set (step 3).

---

## 3. Environment variables (Vercel → Settings → Environment Variables)

Set for **Production** (and Preview if you want staging):

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `DATABASE_URL` | Yes | **Aiven connection pooler URL** (see below) — not the direct Postgres port on Vercel |
| `DATABASE_USE_PGBOUNCER` | Yes on Vercel | `true` when using Aiven pooler / PgBouncer |
| `PRISMA_CONNECTION_LIMIT` | Recommended | `1` on Vercel (auto-default when `VERCEL` is set) |
| `JWT_SECRET` | Yes | Long random string (32+ chars). Generate: `openssl rand -base64 32` |
| `OTP_DEV_MODE` | Yes (for now) | `true` — returns OTP in JSON until SMS is wired |
| `CORS_ORIGINS` | Optional | Expo Web only; native app ignores CORS |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | For web map | Mapbox public token (ops console `/explore`) |

**Do not set** `NODE_ENV` — Vercel sets it to `production`.

### Fix: “Too many database connections” on Vercel

**Aiven free/hobby tiers do not have connection pools** (Startup plan+ required).

Using a **direct** Aiven URL on Vercel will exhaust connections. See the full guide:

**→ [docs/DATABASE_POOLING.md](./DATABASE_POOLING.md)**

**Recommended (free):** [Prisma Accelerate](https://console.prisma.io) — connect your Aiven DB, use `prisma://…` on Vercel:

```
DATABASE_URL=prisma://accelerate.prisma-data.net/?api_key=YOUR_KEY
DIRECT_URL=postgres://USER:PASS@HOST:PORT/defaultdb?sslmode=require
```

If you upgrade Aiven to Startup+, use their pooler URL instead (see DATABASE_POOLING.md Option C).

### Optional tuning

| Variable | Default on Vercel | Purpose |
|----------|-------------------|---------|
| `PRISMA_CONNECTION_LIMIT` | `1` | Max DB connections per serverless instance |
| `PRISMA_POOL_TIMEOUT` | `20` | Seconds to wait for a pool slot |

### `CORS_ORIGINS` example

After deploy you get e.g. `https://juax-backend.vercel.app`. Use:

```
https://juax-backend.vercel.app,http://localhost:5080,http://localhost:8081,exp://localhost:8081
```

Add custom domain when you have one:

```
https://api.juax.co.ke,https://juax-backend.vercel.app,http://localhost:8081
```

> **Expo on a physical device** uses native `fetch` — CORS does not block it. CORS matters for **Expo Web** and browser-based clients only.

### `CORS_ORIGINS` example

Push to `main` or click **Deploy** in Vercel.

After deploy, verify:

```bash
curl https://YOUR-PROJECT.vercel.app/api/health
```

Expected:

```json
{ "status": "ok", "db": "connected" }
```

If `db` is not `connected`, check `DATABASE_URL` (must include `sslmode=require`) and Aiven firewall (allow all IPs or Vercel egress).

---

## 5. Wire the Expo app

In **`apps/my-expo-app/.env`** (or EAS secrets):

```bash
EXPO_PUBLIC_API_BASE_URL=https://YOUR-PROJECT.vercel.app
EXPO_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token
```

Restart Expo after changing env:

```bash
npx expo start -c
```

### Quick API smoke test from terminal

```bash
# Health
curl https://YOUR-PROJECT.vercel.app/api/health

# Send OTP (devMode returns code in body when OTP_DEV_MODE=true)
curl -X POST https://YOUR-PROJECT.vercel.app/api/v1/auth/signin/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"700000004"}'
```

### Auth flow in the app

Follow [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md):

1. `POST /api/v1/auth/signin/send` or `signup/send`  
2. Show `devCode` when `devMode: true`  
3. `POST …/verify` → store `token` in SecureStore  
4. `Authorization: Bearer <token>` on protected routes  

Test user (after seed): phone `700000004`.

---

## 6. Post-deploy checklist

- [ ] `/api/health` → `"db": "connected"`
- [ ] `GET /api/v1/listings?county=kisumu` returns listings
- [ ] OTP send returns `devCode` (if `OTP_DEV_MODE=true`)
- [ ] Expo `EXPO_PUBLIC_API_BASE_URL` points to Vercel URL (no trailing slash)
- [ ] Web console login at `https://YOUR-PROJECT.vercel.app/login`
- [ ] `JWT_SECRET` is unique and not committed to git
- [ ] Aiven password rotated if it was ever exposed

---

## 7. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails on Prisma | Ensure `postinstall`: `prisma generate` in `package.json` |
| 500 on auth / DB errors | Check Vercel function logs; verify `DATABASE_URL` |
| P2024 / too many connections | Use **Aiven pooler URL** + `DATABASE_USE_PGBOUNCER=true` + redeploy |
| `remaining connection slots are reserved` | Same — direct Postgres URL on Vercel exhausts Aiven's ~20 conn limit |
| OTP missing `devCode` in prod | Set `OTP_DEV_MODE=true` on Vercel |
| Expo “Network request failed” | Use HTTPS Vercel URL; on Android emulator use `10.0.2.2` only for **local** backend, not Vercel |
| CORS error in Expo Web | Add your web origin to `CORS_ORIGINS` |

---

## 8. Custom domain (optional)

Vercel → Project → Settings → Domains → e.g. `api.juax.co.ke`

Update:

- Expo: `EXPO_PUBLIC_API_BASE_URL=https://api.juax.co.ke`
- `CORS_ORIGINS` to include the new domain

---

## 9. Related docs

- [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) — Expo auth + API wiring  
- [EXPO_API.md](./EXPO_API.md) — endpoint contracts  
- [IMPLEMENTATION.md](../IMPLEMENTATION.md) — feature status
