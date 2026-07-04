# Expo app API contract

Base URL: set `EXPO_PUBLIC_API_BASE_URL` (e.g. `http://192.168.1.x:5080` dev, `https://your-app.vercel.app` prod).

All paths below are relative to that base. Auth: `Authorization: Bearer <jwt>` unless noted.

---

## 1. Auth & profiles (wire first)

See **[FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)** for full sign-up/sign-in/profile flows and Expo step-by-step wiring.

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/v1/auth/check-phone?phone=` | — | `{ registered, suggestedFlow, devMode }` |
| POST | `/api/v1/auth/signup/send` | `{ "phone": "712345678" }` | `{ ok, devMode, devCode? }` |
| POST | `/api/v1/auth/signup/verify` | `{ phone, code, name, county? }` | `{ token, user, isNewUser }` |
| POST | `/api/v1/auth/signin/send` | `{ "phone": "712345678" }` | `{ ok, devMode, devCode? }` |
| POST | `/api/v1/auth/signin/verify` | `{ phone, code, name? }` | `{ token, user }` |
| POST | `/api/v1/auth/otp/send` | `{ "phone": "712345678" }` | Legacy — same as sign-in send |
| POST | `/api/v1/auth/otp/verify` | `{ phone, code, name? }` | Legacy — auto-creates user |
| GET | `/api/v1/me` | — | `{ user }` |
| GET | `/api/v1/me/profile` | — | `{ user, stats }` |
| PATCH | `/api/v1/me/profile` | `{ displayName?, email?, county?, bio?, avatarUrl? }` | `{ user }` |

**Dev OTP:** when `devMode: true`, show `devCode` on screen (SMS not configured). Store `token` in `expo-secure-store`.

---

## 2. Services & listings (replace hardcoded arrays)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/services` | Gate rides UI when `rides.enabled === false` |
| GET | `/api/v1/listings?type=rental\|bnb&county=kisumu` | Replaces `HOUSE_LISTINGS` / `BNB_LISTINGS` |
| GET | `/api/v1/listings/nearby?lat=&lng=&radiusKm=` | Map pins + carousel |
| GET | `/api/v1/listings/{id}` | Detail sheet; optional JWT for unlock |

**Adapter:**
```ts
coords: { latitude: pin.lat, longitude: pin.lng }
price: `KES ${priceKes.toLocaleString()} / ${priceUnit}`
```

**Location gate:** `locationLocked: true` until subscription (rental) or confirmed BnB booking.

| Method | Path | Status |
|--------|------|--------|
| GET | `/api/v1/subscriptions/plans` | ✅ |
| GET | `/api/v1/subscriptions/active` | Phase 2b |
| POST | `/api/v1/subscriptions` | Phase 2b + M-Pesa |
| POST | `/api/v1/bnb/bookings` | Phase 2b |
| GET | `/api/v1/bnb/bookings` | Phase 2b |

---

## 3. Jua Fua / Mama Fua (laundry)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/v1/laundry/stations` | — | Replaces `PICKUP_STATIONS` |
| GET | `/api/v1/laundry/mamafua/tasks` | — | On-site cleaning task catalog |
| POST | `/api/v1/laundry/orders/estimate` | user | Server pricing preview |
| POST | `/api/v1/laundry/orders` | user | Create order → Trips tab |
| GET | `/api/v1/laundry/orders` | user | User history |
| GET | `/api/v1/laundry/orders/{id}` | user | Status stepper |

### Pickup modes

| `pickupMode` | What happens |
|--------------|--------------|
| `door` | Rider picks up clothes from your address |
| `station` | You drop off / pick up at a Mama Fua hub |
| `mamafua` | **Rider delivers a Mama Fua** with full cleaning kit — they do selected tasks on-site |

### Mama Fua visit (on-site cleaning)

1. `GET /laundry/mamafua/tasks` — show task picker with prices  
2. User selects tasks (WiFi-style checkboxes): vacuum chairs, wash utensils, thorough clean, etc.  
3. `POST /laundry/orders/estimate` with `pickupMode: "mamafua"` + `tasks[]` + address  
4. `POST /laundry/orders` to book

```json
{
  "pickupMode": "mamafua",
  "pickupAddress": "Plot 12, Nyamasaria Rd",
  "pickupLat": -0.09,
  "pickupLng": 34.77,
  "pickupCounty": "kisumu",
  "tasks": ["vacuum_upholstery", "wash_utensils", "mop_floors"],
  "loadKg": 0,
  "scheduleDate": "2026-07-10",
  "scheduleBand": "morning",
  "notes": "Gate code 4421"
}
```

Pricing: **KES 600 dispatch** (rider + equipment) + sum of task prices. If `laundry` task selected, add **KES 400 base + 80/kg**.

Status steps for Mama Fua: Requested → Rider dispatched → Mama Fua arrived → Cleaning in progress → Finishing up → Completed.

### Standard laundry order body
```json
{
  "pickupMode": "door",
  "stationId": "uuid-if-station",
  "pickupAddress": "Nyamasaria Rd",
  "pickupLat": -0.09,
  "pickupLng": 34.77,
  "pickupCounty": "kisumu",
  "loadKg": 4,
  "loadItems": null,
  "scheduleDate": "2026-07-10",
  "scheduleBand": "morning",
  "notes": "Call on arrival"
}
```

### Order response (Trips / active trip UI)
```json
{
  "id": "uuid",
  "pickupMode": "mamafua",
  "serviceType": "mamafua",
  "pickupLabel": "Mama Fua visit · Plot 12, Nyamasaria Rd",
  "loadLabel": "Vacuum chairs & sofas, Wash utensils & kitchen",
  "tasks": ["vacuum_upholstery", "wash_utensils"],
  "taskLabels": ["Vacuum chairs & sofas", "Wash utensils & kitchen"],
  "dispatchFeeKes": 600,
  "tasksFeeKes": 650,
  "totalKes": 1250,
  "estimateKes": 1250,
  "status": "requested",
  "steps": ["Requested", "Rider dispatched", "Mama Fua arrived", "Cleaning in progress", "Finishing up", "Completed"],
  "currentStep": 0,
  "etaMinutes": 90,
  "scheduleDate": "2026-07-10",
  "scheduleBand": "morning"
}
```

**Do not use client-side `LAUNDRY_KES_PER_KG = 180`** — server uses `rate_per_kg: 80`, `pickup_fee: 150` (door), `dispatch: 600` (mamafua).

---

## 4. Admin / ops console (web)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/v1/admin/users` | admin |
| GET/POST | `/api/v1/admin/listings` | admin — add rentals/BnB |
| POST | `/api/v1/admin/listings/{id}/publish` | admin |
| GET/POST | `/api/v1/admin/laundry/stations` | admin — Mama Fua hubs |
| GET | `/api/v1/admin/laundry/orders?status=` | admin — FUA queue |
| PATCH | `/api/v1/admin/laundry/orders/{id}/status` | admin — `{ status, note? }` |

---

## 5. Suggested Expo wiring order

1. `EXPO_PUBLIC_API_BASE_URL` + auth + secure token  
2. `GET /services`, `GET /listings`, `GET /listings/nearby`, `GET /listings/{id}`  
3. `GET /laundry/stations`  
4. `POST /laundry/orders/estimate` + `POST /laundry/orders` + `GET /laundry/orders`  
5. Subscriptions & BnB (Phase 2b)  
6. M-Pesa STK (Phase 6)

---

## 6. Mapbox (stays in app for now)

- `EXPO_PUBLIC_MAPBOX_TOKEN` — geocoding, directions, map WebView  
- Backend `nearby` uses lat/lng from GPS or Mapbox geocode results
