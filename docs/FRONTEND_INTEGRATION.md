# Frontend integration guide

How to connect the **Expo mobile app** (`/apps/my-expo-app`) and any web client to the **Jua X backend** (`/apps/backend`).

**Base URL**

| Environment | Value |
|-------------|--------|
| Local dev (Expo on device/emulator) | `http://<your-lan-ip>:5080` |
| Local dev (web console) | `http://localhost:5080` (same origin — no CORS setup needed) |
| Production | `https://your-app.vercel.app` |

Set in Expo: `EXPO_PUBLIC_API_BASE_URL`  
Add your LAN IP and production origins to backend `CORS_ORIGINS` in `.env`.

---

## 1. Users, sign-up, sign-in, profiles

The backend owns the full user lifecycle:

1. **Sign up** — new phone → OTP → create account + profile  
2. **Sign in** — existing phone → OTP → JWT  
3. **Profile** — read/update after login  

SMS is **not wired yet**. In dev/staging the OTP is returned in the API response (`devCode`) so you can show it on screen.

### Endpoints

| Step | Method | Path | Auth |
|------|--------|------|------|
| Check phone | GET | `/api/v1/auth/check-phone?phone=712345678` | — |
| Sign up — send OTP | POST | `/api/v1/auth/signup/send` | — |
| Sign up — verify | POST | `/api/v1/auth/signup/verify` | — |
| Sign in — send OTP | POST | `/api/v1/auth/signin/send` | — |
| Sign in — verify | POST | `/api/v1/auth/signin/verify` | — |
| Legacy OTP send | POST | `/api/v1/auth/otp/send` | — |
| Legacy OTP verify | POST | `/api/v1/auth/otp/verify` | — |
| Current user (light) | GET | `/api/v1/me` | Bearer |
| Full profile + stats | GET | `/api/v1/me/profile` | Bearer |
| Update profile | PATCH | `/api/v1/me/profile` | Bearer |

Prefer **signin/signup** paths in new UI. Legacy `/otp/*` still works (auto-creates users on verify).

### Phone format

Send **9 digits** without country code (e.g. `712345678`) or full E.164. Backend normalizes to `+254…`.

### Dev OTP on screen

When `NODE_ENV !== "production"` (or `OTP_DEV_MODE=true`), send-OTP responses include:

```json
{
  "ok": true,
  "message": "OTP generated — enter the code shown below (SMS not configured yet)",
  "flow": "signin",
  "devMode": true,
  "devCode": "205778",
  "otpDisplayHint": "Until SMS is wired, the 6-digit code is returned in this response. Show it on screen for the user."
}
```

**Expo / web UI:** if `devMode && devCode`, show a banner with the code and pre-fill the OTP inputs (same as the web console at `/login`).

In production (`NODE_ENV=production`, `OTP_DEV_MODE` unset/false), `devCode` is omitted and SMS will be used once integrated.

### Sign-up flow

```
User enters phone + name (+ optional county)
        │
        ▼
POST /auth/signup/send  { "phone": "712345678" }
        │
        ▼  (show devCode on screen in dev)
User enters 6-digit code
        │
        ▼
POST /auth/signup/verify
{
  "phone": "712345678",
  "code": "205778",
  "name": "Jane Wanjiku",
  "county": "kisumu"          // optional
}
        │
        ▼
201 { token, user, isNewUser: true, flow: "signup" }
```

**Errors**

| Code | HTTP | Meaning |
|------|------|---------|
| `account_exists` | 409 | Phone already registered → switch to sign-in |
| `name_required` | 400 | Name missing on new sign-up |
| `invalid_code` | 400 | Wrong or expired OTP |
| `rate_limited` | 429 | Too many OTP requests |

### Sign-in flow

```
POST /auth/signin/send  { "phone": "712345678" }
        │
        ▼
POST /auth/signin/verify  { "phone", "code", "name?" }
        │
        ▼
200 { token, user, isNewUser: false, flow: "signin" }
```

**Errors**

| Code | HTTP | Meaning |
|------|------|---------|
| `account_not_found` | 404 | No account → switch to sign-up |
| `invalid_code` | 400 | Wrong or expired OTP |

Optional: call `GET /auth/check-phone?phone=…` first → `{ registered, suggestedFlow: "signin"|"signup" }` to pick the right tab automatically.

### User object (JWT payload companion)

```json
{
  "id": "uuid",
  "phone": "+254712345678",
  "displayName": "Jane Wanjiku",
  "email": null,
  "county": "kisumu",
  "bio": null,
  "avatarUrl": null,
  "role": "user",
  "signedUpAt": "2026-07-04T12:00:00.000Z",
  "lastLoginAt": "2026-07-04T18:30:00.000Z"
}
```

Roles: `user` | `agent` | `admin` (only seed/admin UI assigns agent/admin).

### Profile (after login)

**GET `/api/v1/me/profile`**

```json
{
  "user": {
    "...user fields...",
    "stats": {
      "laundryOrders": 2,
      "bnbBookings": 0,
      "feedback": 1
    }
  }
}
```

**PATCH `/api/v1/me/profile`**

```json
{
  "displayName": "Jane W.",
  "email": "jane@example.com",
  "county": "kisumu",
  "bio": "Nyamasaria local",
  "avatarUrl": "https://…"
}
```

All fields optional; send `null` to clear email/county/bio/avatar.

### Token storage

| Client | Storage |
|--------|---------|
| Expo | `expo-secure-store` — key e.g. `juax_token` |
| Web console | `localStorage` (`juax_token`, `juax_user`) — see `src/lib/api/client.ts` |

Attach to every authenticated request:

```
Authorization: Bearer <jwt>
```

On **401**, clear token and redirect to auth screen.

---

## 2. Expo wiring — step by step

### 2.1 Environment

```bash
# my-expo-app/.env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:5080
EXPO_PUBLIC_MAPBOX_TOKEN=pk.…
```

Backend `.env`:

```
CORS_ORIGINS=http://localhost:8081,exp://192.168.1.42:8081,http://192.168.1.42:5080
OTP_DEV_MODE=true
```

Restart both apps after changing env.

### 2.2 Create a small API client

```typescript
// lib/api.ts
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL!;

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message ?? "Request failed", data.error, res.status);
  return data as T;
}
```

### 2.3 Replace mock auth in `AuthScreen.tsx`

Current file uses `setTimeout` mocks. Replace with:

| UI stage | API call |
|----------|----------|
| Send code (sign-up) | `POST /api/v1/auth/signup/send` |
| Send code (sign-in) | `POST /api/v1/auth/signin/send` |
| Verify OTP (sign-in) | `POST /api/v1/auth/signin/verify` |
| Name step (sign-up) | `POST /api/v1/auth/signup/verify` with `name`, optional `county` |

**Suggested changes to `AuthScreen.tsx`:**

1. Add props or context: `apiBaseUrl`, `onAuthSuccess(token, user)`.
2. In `sendCode()` — call signup/signin send; store `devCode` in state.
3. If `response.devMode && response.devCode` — render dev banner + auto-fill OTP cells.
4. In `onOtpChange` / `verifyOtp` — call verify endpoint; on success save token via SecureStore.
5. Sign-up: after OTP verify **or** on name step — call signup verify with `name` (signup verify can include name in one shot if you skip separate name stage after OTP).
6. Map errors: `account_not_found` → suggest sign-up; `account_exists` → suggest sign-in.

**Minimal sign-in example:**

```typescript
const send = await api<{ devCode?: string; devMode?: boolean }>(
  "/api/v1/auth/signin/send",
  { method: "POST", body: { phone: digitsOnly } },
);
if (send.devMode && send.devCode) {
  setDevCode(send.devCode);
  setOtp(send.devCode.split(""));
}

const verified = await api<{ token: string; user: ApiUser }>(
  "/api/v1/auth/signin/verify",
  { method: "POST", body: { phone: digitsOnly, code: otp.join("") } },
);
await SecureStore.setItemAsync("juax_token", verified.token);
```

### 2.4 Auth context in Expo

Hold `{ token, user, loading }` at app root (similar to backend `src/contexts/auth-context.tsx`):

- On launch: read token → `GET /api/v1/me` to validate  
- Expose `signOut()` — delete SecureStore keys  
- Gate tabs that need login (FUA order, profile, feedback)

### 2.5 Profile screen

- Load: `GET /api/v1/me/profile`  
- Edit form → `PATCH /api/v1/me/profile`  
- Show `stats.laundryOrders` on Trips/profile header

Web reference implementation: `/profile` in the ops console.

---

## 3. After auth — feature wiring order

| Priority | Feature | Endpoints | Replaces in Expo |
|----------|---------|-----------|------------------|
| 1 | Auth + profile | §1 above | `AuthScreen` mocks |
| 2 | Services flags | `GET /api/v1/services` | Hardcoded feature toggles |
| 3 | Listings browse | `GET /api/v1/listings`, `nearby`, `{id}` | `HOUSE_LISTINGS`, map pins |
| 4 | FUA | `GET /laundry/stations`, `POST /orders`, `GET /orders` | Laundry mock + pricing |
| 5 | Mama Fua | `GET /laundry/mamafua/tasks` | Task picker UI |
| 6 | Feedback | `POST /api/v1/feedback` | Post-trip rating sheet |
| 7 | Subscriptions / BnB | Phase 2b | Unlock `locationLocked` listings |

Full request/response shapes for listings, FUA, feedback: [EXPO_API.md](./EXPO_API.md).

---

## 4. Web console (this repo)

The Next.js app **is** a frontend client:

| Page | Purpose |
|------|---------|
| `/login` | Sign-in / sign-up tabs, dev OTP banner |
| `/profile` | Profile view/edit |
| `/listings`, `/explore` | Public listing browse |
| `/admin/*` | Admin/agent ops (role-gated) |

Client code: `src/lib/api/client.ts`, `src/contexts/auth-context.tsx`.

---

## 5. Test accounts (dev)

| Phone | Role |
|-------|------|
| `700000001` | admin |
| `700000002` | agent |
| `700000003` | agent |
| `700000004` | user |

Run backend: `npm run dev` (port 5080)  
Smoke test: `npm run smoke`

---

## 6. Production (Vercel)

Full deploy steps: **[VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)**

Quick summary:

1. Deploy backend to Vercel with env vars (`DATABASE_URL`, `JWT_SECRET`, `OTP_DEV_MODE=true`, `CORS_ORIGINS`)
2. Set Expo: `EXPO_PUBLIC_API_BASE_URL=https://your-project.vercel.app`
3. Restart Expo: `npx expo start -c`
4. Verify: `curl https://your-project.vercel.app/api/health`

Until SMS is live, keep **`OTP_DEV_MODE=true`** on Vercel so the app can show `devCode` on screen.

## 7. Production checklist

- [ ] Set strong `JWT_SECRET` on Vercel  
- [ ] `OTP_DEV_MODE=true` until SMS integrated (otherwise no `devCode` in prod)  
- [ ] Integrate SMS provider (Africa's Talking / Twilio) in `sendOtp()`  
- [ ] Set `CORS_ORIGINS` to include Vercel URL (+ Expo Web if used)  
- [ ] Expo: `EXPO_PUBLIC_API_BASE_URL` → production URL (no trailing slash)  
- [ ] Remove dev OTP UI behind `devMode` flag only (hide when SMS goes live)  

---

## 8. Related docs

- [EXPO_API.md](./EXPO_API.md) — listings, FUA, feedback contracts  
- [IMPLEMENTATION.md](../IMPLEMENTATION.md) — backend completion status  
- [OVERVIEW.md](../OVERVIEW.md) — product overview
