-- Listing requests: viewings, tours, agent chat, rider dispatch

DO $$ BEGIN
  CREATE TYPE listing_request_kind AS ENUM ('viewing', 'tour', 'stay');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_request_status AS ENUM (
    'requested',
    'agent_contacted',
    'rider_assigned',
    'rider_en_route',
    'viewing_completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_message_sender AS ENUM ('user', 'admin', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS listing_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  listing_id   UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  kind         listing_request_kind NOT NULL,
  status       listing_request_status NOT NULL DEFAULT 'requested',
  user_note    TEXT,
  rider_name   TEXT,
  rider_phone  TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_requests_user ON listing_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_requests_status ON listing_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS listing_request_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES listing_requests (id) ON DELETE CASCADE,
  sender_role listing_message_sender NOT NULL,
  body        TEXT NOT NULL,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_request_messages ON listing_request_messages (request_id, created_at ASC);
