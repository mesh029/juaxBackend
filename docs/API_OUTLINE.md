# API outline (MVP)

Base URL: `/v1`  
Auth: `Authorization: Bearer <jwt>` unless noted.

## Auth

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/auth/otp/send` | — | `{ "phone": "712345678" }` |
| POST | `/auth/otp/verify` | — | `{ "phone": "712345678", "code": "123456", "name": "Jane" }` |
| GET | `/me` | user+ | — |

## Listings (public browse)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/listings` | optional | Query: `type`, `county`, `lat`, `lng`, `radiusKm`, `vacant` |
| GET | `/listings/{id}` | optional | Public DTO; gate applied if authed |
| GET | `/listings/nearby` | optional | Kisumu pilot default radius from settings |

## Subscriptions (rental unlock)

| Method | Path | Auth | Body |
|--------|------|------|------|
| GET | `/subscriptions/plans` | — | Returns daily/weekly/monthly KES |
| POST | `/subscriptions` | user | `{ "plan": "weekly" }` → STK push |
| GET | `/subscriptions/active` | user | Current unlock window |
| POST | `/webhooks/mpesa` | — | Daraja callback (signed) |

## BnB bookings

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/bnb/bookings` | user | `{ listingId, checkIn, checkOut, guests }` |
| GET | `/bnb/bookings` | user | User's trips |
| GET | `/bnb/bookings/{id}` | user | Full address if confirmed |

## Laundry (FUA)

| Method | Path | Auth | Body |
|--------|------|------|------|
| GET | `/laundry/stations` | — | Map pins |
| GET | `/laundry/mamafua/tasks` | — | Task catalog + dispatch fee |
| POST | `/laundry/orders/estimate` | user | `{ pickupMode, loadKg, tasks?, ... }` |
| POST | `/laundry/orders` | user | Create order (`pickupMode`: door \| station \| mamafua) |
| GET | `/laundry/orders` | user | History + active |
| GET | `/laundry/orders/{id}` | user | Status stepper |

## Admin (`role = admin`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/admin/users` | User directory |
| GET/POST | `/admin/listings` | List + create rentals/BnB |
| PATCH | `/admin/listings/{id}` | Update fields |
| POST | `/admin/listings/{id}/publish` | — |
| POST | `/admin/listings/{id}/archive` | — |
| GET/POST | `/admin/laundry/stations` | Mama Fua hubs |
| PATCH | `/admin/laundry/stations/{id}` | Update station |
| GET | `/admin/laundry/orders` | Filter `?status=` |
| PATCH | `/admin/laundry/orders/{id}/status` | `{ status, note }` |
| POST | `/admin/laundry/orders/{id}/notes` | Ops note |
| GET | `/admin/settings` | App toggles (Phase 7) |
| PATCH | `/admin/settings` | Update toggles |
| POST | `/admin/users/{id}/promote-agent` | — |

## Rides (coming soon)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/rides/interest` | Waitlist email/phone note |
| GET | `/services` | Returns `rides: { enabled: false }` |

## Error shape

```json
{
  "error": "location_locked",
  "message": "Subscribe to unlock rental locations in Kisumu"
}
```
