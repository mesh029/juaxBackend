# Frontend auth & API guide

Tell your Expo/web team to use this doc alongside [EXPO_API.md](./EXPO_API.md).

**Base URL:** `EXPO_PUBLIC_API_BASE_URL` (e.g. `https://your-app.vercel.app`)

**Auth header (after login):** `Authorization: Bearer <token>`

---

## 1. Email + password (recommended for app v1)

### Sign up

```
POST /api/v1/auth/email/signup
Content-Type: application/json

{
  "email": "jane@example.com",
  "password": "SecurePass1",
  "name": "Jane Wanjiku",
  "county": "kisumu",
  "phone": "712345678"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `email` | yes | Unique, stored lowercased |
| `password` | yes | Min 8 characters |
| `name` | yes | Display name |
| `county` | no | e.g. `kisumu` |
| `phone` | no | +254 9-digit; auto-generated if omitted |

**201 response:**

```json
{
  "token": "eyJ…",
  "user": {
    "id": "uuid",
    "phone": "+2547…",
    "email": "jane@example.com",
    "displayName": "Jane Wanjiku",
    "role": "user",
    "county": "kisumu"
  },
  "isNewUser": true,
  "flow": "email_signup"
}
```

**Errors:** `409 email_exists` · `409 phone_exists` · `400 weak_password` · `400 name_required`

### Sign in

```
POST /api/v1/auth/email/signin

{
  "email": "jane@example.com",
  "password": "SecurePass1"
}
```

**200 response:** `{ "token", "user", "flow": "email_signin" }`

**401:** `{ "error": "invalid_credentials", "message": "Invalid email or password" }`

### Store token

```typescript
import * as SecureStore from "expo-secure-store";
await SecureStore.setItemAsync("juax_token", data.token);
```

---

## 2. Phone OTP (later / optional)

Still available when SMS is wired. In dev, OTP code is returned as `devCode` when `OTP_DEV_MODE=true`.

| Step | Endpoint |
|------|----------|
| Sign up send | `POST /api/v1/auth/signup/send` `{ "phone" }` |
| Sign up verify | `POST /api/v1/auth/signup/verify` `{ phone, code, name }` |
| Sign in send | `POST /api/v1/auth/signin/send` `{ "phone" }` |
| Sign in verify | `POST /api/v1/auth/signin/verify` `{ phone, code }` |

---

## 3. Profile (after login)

| Method | Path | Body |
|--------|------|------|
| GET | `/api/v1/me` | — |
| GET | `/api/v1/me/profile` | — includes `stats` |
| PATCH | `/api/v1/me/profile` | `{ displayName?, email?, county?, bio?, avatarUrl? }` |

---

## 4. Listings (Saka Keja)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/listings?county=kisumu&type=rental\|bnb` | — | Browse |
| GET | `/api/v1/listings/nearby?lat=&lng=&radiusKm=` | — | Map pins |
| GET | `/api/v1/listings/{id}` | optional JWT | Detail / “view request” |

**Location gate:** `locationLocked: true` hides exact address, GPS pin, host phone until subscription (rental) or BnB booking.

**Listing view = `GET /api/v1/listings/{id}`** — no separate “request view” endpoint.

---

## 5. Jua Fua

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/laundry/stations` | — |
| GET | `/api/v1/laundry/mamafua/tasks` | — |
| POST | `/api/v1/laundry/orders/estimate` | JWT |
| POST | `/api/v1/laundry/orders` | JWT |
| GET | `/api/v1/laundry/orders` | JWT |
| GET | `/api/v1/laundry/orders/{id}` | JWT |

**Estimate / create body (door pickup):**

```json
{
  "pickupMode": "door",
  "pickupAddress": "Nyamasaria Rd",
  "pickupLat": -0.108,
  "pickupLng": 34.763,
  "pickupCounty": "kisumu",
  "loadKg": 5,
  "scheduleDate": "2026-07-10",
  "scheduleBand": "morning",
  "notes": "Call on arrival"
}
```

---

## 6. Feedback

```
POST /api/v1/feedback
Authorization: Bearer <token>

{
  "service": "fua",
  "category": "rating",
  "rating": 5,
  "body": "Great service",
  "orderId": "uuid-optional"
}
```

---

## 7. Test all endpoints locally

```bash
npm run dev          # terminal 1
npm run walkthrough  # terminal 2 — prints every response to console
```

Against Vercel:

```bash
SMOKE_BASE_URL=https://your-app.vercel.app npm run walkthrough
```

---

## 8. Expo wiring order

1. Email sign up / sign in + SecureStore token **and** cache `user.id`
2. `GET /me/profile` on app launch
3. Listings browse + detail (**send JWT on detail** when signed in)
4. FUA estimate → create → list orders (all with JWT)
5. Feedback after completed order (JWT + `orderId`)
6. OTP flow when SMS goes live

---

## 9. User ID & tracking (for frontend)

The API **never trusts `userId` from the request body** for owned resources. Identity comes from the JWT:

```
Authorization: Bearer <token>
         ↓
JWT sub = users.id (UUID)
         ↓
FUA orders, feedback, agent listings → saved with that user_id
```

| Your action | Send token? | Stored as |
|-------------|-------------|-----------|
| Create FUA order | **Yes** | `laundry_orders.user_id` |
| List my orders | **Yes** | Filtered by your `user_id` |
| Submit FUA feedback | **Yes** | `service_feedback.user_id` |
| View listing detail | Optional | Unlock check uses your id; **no view log table yet** |
| Browse listings | No | Public |

Response `user` object always includes `id` — use it for local state only, not as an API input field.

Full tracking matrix: [IMPLEMENTATION.md](../IMPLEMENTATION.md#identity--user-tracking)
