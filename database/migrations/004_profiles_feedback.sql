-- User profile fields + service feedback

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS county TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email IS NOT NULL;

DO $$ BEGIN
  CREATE TYPE feedback_service AS ENUM ('fua', 'mamafua', 'bnb', 'rental', 'general', 'app');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE feedback_category AS ENUM ('rating', 'complaint', 'suggestion', 'praise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE feedback_status AS ENUM ('new', 'reviewed', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS service_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users (id) ON DELETE SET NULL,
  service       feedback_service NOT NULL,
  category      feedback_category NOT NULL DEFAULT 'rating',
  rating        SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  title         TEXT,
  body          TEXT NOT NULL,
  order_id      UUID REFERENCES laundry_orders (id) ON DELETE SET NULL,
  listing_id    UUID REFERENCES listings (id) ON DELETE SET NULL,
  status        feedback_status NOT NULL DEFAULT 'new',
  admin_notes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status_created
  ON service_feedback (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_service
  ON service_feedback (service, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_user
  ON service_feedback (user_id) WHERE user_id IS NOT NULL;
