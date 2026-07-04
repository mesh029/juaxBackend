-- Granular FUA / Mama Fua progress tracking

DO $$ BEGIN
  CREATE TYPE laundry_actor_role AS ENUM ('customer', 'rider', 'station', 'admin', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE laundry_event_kind AS ENUM (
    'order_placed',
    'customer_dropped_at_station',
    'items_received_at_station',
    'rider_assigned',
    'rider_en_route',
    'items_picked_up',
    'received_at_hub',
    'washing_started',
    'washing_complete',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered_to_customer',
    'customer_collected',
    'mamafua_dispatched',
    'mamafua_arrived',
    'cleaning_started',
    'cleaning_complete',
    'visit_completed',
    'note'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS laundry_tracking_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES laundry_orders (id) ON DELETE CASCADE,
  kind        laundry_event_kind NOT NULL,
  actor_role  laundry_actor_role NOT NULL,
  note        TEXT,
  created_by  UUID REFERENCES users (id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_laundry_tracking_order
  ON laundry_tracking_events (order_id, created_at ASC);
