-- Jua X — initial schema (FUA + Saka Keja pilot)
-- Run against Aiven Postgres: psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Roles ───────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('user', 'agent', 'admin');
CREATE TYPE listing_type AS ENUM ('bnb', 'rental');
CREATE TYPE listing_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE subscription_plan AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE pickup_mode AS ENUM ('door', 'station');
CREATE TYPE laundry_status AS ENUM (
  'requested',
  'pickup_scheduled',
  'collected',
  'processing',
  'ready',
  'delivered',
  'cancelled'
);
CREATE TYPE booking_status AS ENUM ('pending_payment', 'confirmed', 'cancelled', 'completed');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed');

-- ─── Users ───────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164    TEXT NOT NULL UNIQUE,          -- +2547XXXXXXXX
  display_name  TEXT,
  role          user_role NOT NULL DEFAULT 'user',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users (role);

-- OTP sessions (replace with Redis in production if needed)
CREATE TABLE otp_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164    TEXT NOT NULL,
  code_hash     TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_sessions (phone_e164, expires_at);

-- ─── App settings (admin toggles) ───────────────────────────────────────────

CREATE TABLE app_settings (
  key           TEXT PRIMARY KEY,
  value_json    JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES users (id)
);

INSERT INTO app_settings (key, value_json) VALUES
  ('rental_location_requires_subscription', 'true'),
  ('bnb_location_requires_subscription', 'false'),
  ('default_search_radius_km', '5'),
  ('kisumu_only_listings', 'true'),
  ('rides_enabled', 'false');

-- ─── Saka Keja — listings (agent-owned) ─────────────────────────────────────

CREATE TABLE listings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID NOT NULL REFERENCES users (id),
  type              listing_type NOT NULL,
  status            listing_status NOT NULL DEFAULT 'draft',

  title             TEXT NOT NULL,
  description       TEXT,

  -- Public (always visible)
  neighborhood      TEXT NOT NULL,               -- e.g. "Nyamasaria"
  county            TEXT NOT NULL DEFAULT 'kisumu',
  beds              SMALLINT NOT NULL DEFAULT 1,
  baths             SMALLINT NOT NULL DEFAULT 1,
  sqm               INTEGER,
  furnished         BOOLEAN NOT NULL DEFAULT FALSE,
  amenities         TEXT[] NOT NULL DEFAULT '{}',
  price_kes         INTEGER NOT NULL,
  price_unit        TEXT NOT NULL CHECK (price_unit IN ('night', 'month')),
  rating            NUMERIC(2,1),
  review_count      INTEGER NOT NULL DEFAULT 0,

  -- Map — approximate pin always shown (offset from exact)
  approx_lat        DOUBLE PRECISION NOT NULL,
  approx_lng        DOUBLE PRECISION NOT NULL,

  -- Gated — subscription (rental) or booking paid (bnb)
  exact_address     TEXT,
  exact_lat         DOUBLE PRECISION,
  exact_lng         DOUBLE PRECISION,
  host_name         TEXT,
  host_phone        TEXT,
  host_whatsapp     TEXT,

  vacant            BOOLEAN NOT NULL DEFAULT TRUE,  -- rentals: only vacant shown
  cleaning_fee_kes  INTEGER NOT NULL DEFAULT 0,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listings_type_status ON listings (type, status);
CREATE INDEX idx_listings_county ON listings (county);
CREATE INDEX idx_listings_agent ON listings (agent_id);

-- TODO Phase 6: listing_images (url, sort_order, alt_text)
-- TODO Phase 7: listing_tours (matterport_url, provider)

-- ─── Subscriptions (rental location unlock) ─────────────────────────────────

CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users (id),
  plan            subscription_plan NOT NULL,
  price_kes       INTEGER NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  payment_status  payment_status NOT NULL DEFAULT 'pending',
  mpesa_receipt   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_active ON subscriptions (user_id, expires_at)
  WHERE payment_status = 'success';

-- ─── BnB bookings (book-to-reveal address) ──────────────────────────────────

CREATE TABLE bnb_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users (id),
  listing_id      UUID NOT NULL REFERENCES listings (id),
  check_in        DATE NOT NULL,
  check_out       DATE NOT NULL,
  guests          SMALLINT NOT NULL DEFAULT 1,
  nights          INTEGER NOT NULL,
  nightly_rate    INTEGER NOT NULL,
  cleaning_fee    INTEGER NOT NULL DEFAULT 0,
  total_kes       INTEGER NOT NULL,
  status          booking_status NOT NULL DEFAULT 'pending_payment',
  payment_status  payment_status NOT NULL DEFAULT 'pending',
  mpesa_receipt   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bnb_bookings_user ON bnb_bookings (user_id);

-- ─── Jua Fua — stations & orders ────────────────────────────────────────────

CREATE TABLE laundry_stations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,            -- WL, CB, …
  name          TEXT NOT NULL,
  address       TEXT NOT NULL,
  county        TEXT NOT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE laundry_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users (id),
  pickup_mode       pickup_mode NOT NULL,
  station_id        UUID REFERENCES laundry_stations (id),

  -- Door pickup
  pickup_address    TEXT,
  pickup_lat        DOUBLE PRECISION,
  pickup_lng        DOUBLE PRECISION,
  pickup_county     TEXT,

  load_kg           NUMERIC(5,1) NOT NULL DEFAULT 4,
  load_items        INTEGER,
  schedule_date     DATE NOT NULL,
  schedule_band     TEXT NOT NULL,               -- morning | afternoon | evening

  rate_per_kg       INTEGER NOT NULL DEFAULT 80,
  pickup_fee_kes    INTEGER NOT NULL DEFAULT 150,
  total_kes         INTEGER NOT NULL,

  status            laundry_status NOT NULL DEFAULT 'requested',
  payment_status    payment_status NOT NULL DEFAULT 'pending',
  mpesa_receipt     TEXT,

  admin_notes       TEXT,
  assigned_to       UUID REFERENCES users (id),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_laundry_orders_status ON laundry_orders (status, created_at DESC);
CREATE INDEX idx_laundry_orders_user ON laundry_orders (user_id);

CREATE TABLE laundry_status_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES laundry_orders (id) ON DELETE CASCADE,
  status        laundry_status NOT NULL,
  note          TEXT,
  created_by    UUID REFERENCES users (id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Rides — placeholder (coming soon) ──────────────────────────────────────

CREATE TABLE rides_coming_soon (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users (id),
  interest_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Updated_at trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_listings_updated BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_bnb_bookings_updated BEFORE UPDATE ON bnb_bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_laundry_orders_updated BEFORE UPDATE ON laundry_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
