-- Customer confirms delivery before leaving a review
ALTER TABLE laundry_orders
  ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ;
