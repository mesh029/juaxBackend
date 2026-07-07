-- Viewing pickup preference: car/taxi vs motorbike rider

DO $$ BEGIN
  CREATE TYPE viewing_pickup_mode AS ENUM ('taxi', 'rider');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE listing_requests
  ADD COLUMN IF NOT EXISTS pickup_mode viewing_pickup_mode;
