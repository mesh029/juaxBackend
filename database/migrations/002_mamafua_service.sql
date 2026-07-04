-- Mama Fua: rider-delivered on-site cleaning (pickup_mode = mamafua)

DO $$ BEGIN
  ALTER TYPE pickup_mode ADD VALUE 'mamafua';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE laundry_orders
  ADD COLUMN IF NOT EXISTS tasks TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE laundry_orders
  ADD COLUMN IF NOT EXISTS tasks_fee_kes INTEGER NOT NULL DEFAULT 0;
