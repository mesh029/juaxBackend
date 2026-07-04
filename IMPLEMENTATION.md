# Jua X Backend — Implementation Progress

**Last updated:** July 4, 2026  
**Overall completion:** **~72%** of MVP backend + ops console scope

---

## Summary

| Area | Progress | Notes |
|------|----------|--------|
| **Overall MVP** | **72%** | API, console, FUA, listings admin largely done |
| Foundation & DB | 95% | Aiven live, Prisma, migrations 001–004 |
| Auth & profiles | 85% | OTP + sign-in/sign-up aliases, profile PATCH |
| Saka Keja browse | 90% | Listings, nearby, location gate, plans |
| FUA / Mama Fua | 88% | Orders, mamafua tasks, tracking, admin queue |
| Admin ops console | 80% | Listings, FUA, feedback, users, map |
| Payments (M-Pesa) | 0% | Phase 6 |
| Expo app integration | 5% | Contract docs only |
| Deploy (Vercel) | 10% | Builds pass locally |

---

## Phase breakdown

```
Phase 0  Foundation        ███████████████████░  95%
Phase 1  Auth              █████████████████░░░  85%
Phase 2  Keja browse        ██████████████████░░  90%
Phase 2b Subscriptions/BnB  ████░░░░░░░░░░░░░░░░  20%
Phase 3  Agent listings    ████████████████░░░░  80%  (admin CRUD; agent role UI pending)
Phase 4  FUA orders         █████████████████░░░  88%
Phase 5  FUA admin          █████████████████░░░  85%
Phase 6  M-Pesa             ░░░░░░░░░░░░░░░░░░░░   0%
Phase 7  Admin ops          ████████████████░░░░  80%
Phase 8  Rides waitlist     ██████░░░░░░░░░░░░░░  50%
Phase 9  Feedback & UX     █████████████████░░░  85%  (new)
Phase 10 Expo wiring       █░░░░░░░░░░░░░░░░░░░   5%
```

**Weighted overall:** ~**72%**

---

## Completed (this sprint)

### Feedback system
- `POST /api/v1/feedback` — ratings, complaints, praise (FUA, Mama Fua, BnB, rental, app)
- `GET /api/v1/admin/feedback` — filter by status/service, summary stats
- `PATCH /api/v1/admin/feedback/{id}` — reviewed / resolved
- Admin UI: `/admin/feedback`

### User profiles
- DB: `county`, `email`, `bio`, `avatar_url`, `last_login_at`
- `GET /api/v1/me/profile` — profile + activity stats (orders, bookings, feedback)
- `PATCH /api/v1/me/profile` — update display name, email, county, bio, avatar
- `GET /api/v1/admin/users/{id}` — full profile for ops

### Auth (sign up / sign in)
| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/auth/signin/send` | Sign in — send OTP |
| `POST /api/v1/auth/signin/verify` | Sign in — verify OTP → JWT |
| `POST /api/v1/auth/signup/send` | Sign up — send OTP |
| `POST /api/v1/auth/signup/verify` | Sign up — verify + **required name** → JWT |
| `POST /api/v1/auth/otp/send` | Legacy alias (unchanged) |
| `POST /api/v1/auth/otp/verify` | Legacy alias (unchanged) |

### Listings admin (prior sprint, still active)
- Full form with amenities, map coords, edit, toasts, field errors
- Map **Use my location** — high-accuracy GPS, Kenya bounds check, immediate pin + flyTo

### FUA (prior + current)
- Mama Fua on-site tasks + pricing
- Granular **tracking events** (rider, station, customer checkpoints)
- Admin queue with activity log

### Performance
- Prisma connection pool tuning (`connection_limit=3`, `pool_timeout=30`)
- Lean `select` on admin users, feedback, listings
- DB indexes on feedback (`status`, `service`, `user`)
- Parallel stats fetch for profiles (`Promise.all`)

---

## API inventory (live)

### Public
- `GET /api/health`
- `GET /api/v1/services`
- `GET /api/v1/listings`, `/nearby`, `/{id}`
- `GET /api/v1/laundry/stations`, `/mamafua/tasks`
- `GET /api/v1/subscriptions/plans`

### Auth
- OTP, sign-in, sign-up (see above)
- `GET /api/v1/me`, `GET|PATCH /api/v1/me/profile`

### User (JWT)
- Laundry orders CRUD + estimate
- `POST /api/v1/feedback`

### Admin
- Users, listings CRUD, stations, FUA queue + status + tracking
- **Feedback** list + patch

---

## Not done yet

| Item | Phase | Priority |
|------|-------|----------|
| M-Pesa STK + webhooks | 6 | High |
| `POST /subscriptions`, active subscription | 2b | High |
| BnB booking create + unlock | 2b | High |
| Expo app API wiring | 10 | High |
| Agent-scoped listing UI (non-admin) | 3 | Medium |
| Rider mobile checkpoint app | 5 | Medium |
| Push notifications | — | Low |
| Listing images (S3/Cloudinary) | — | Low |
| Vercel production deploy | 0 | Medium |

---

## Migrations

| File | Contents |
|------|----------|
| `001_initial_schema.sql` | Core schema |
| `002_mamafua_service.sql` | `pickup_mode.mamafua`, tasks |
| `003_laundry_tracking.sql` | Tracking events |
| `004_profiles_feedback.sql` | User profile fields, service_feedback |

Run latest: `node scripts/run-migration.mjs 004_profiles_feedback.sql` (or apply SQL manually on Aiven).

---

## Next recommended steps

1. Wire Expo app to auth + listings + FUA + feedback endpoints  
2. Phase 2b — subscription create + BnB booking  
3. M-Pesa Daraja integration  
4. Deploy API to Vercel  
5. Rider/agent lightweight checkpoint UI (Expo or PWA)

See also: [`OVERVIEW.md`](./OVERVIEW.md) · [`docs/EXPO_API.md`](./docs/EXPO_API.md) · [`docs/API_OUTLINE.md`](./docs/API_OUTLINE.md)
