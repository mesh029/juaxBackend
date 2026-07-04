-- Pilot seed — Kisumu listings (text only) + laundry stations
-- Run after 001_initial_schema.sql

-- Admin + agent (passwordless — OTP only)
INSERT INTO users (id, phone_e164, display_name, role) VALUES
  ('00000000-0000-4000-8000-000000000001', '+254700000001', 'Jua Admin', 'admin'),
  ('00000000-0000-4000-8000-000000000002', '+254700000002', 'Kisumu Agent', 'agent');

-- Laundry stations (sample)
INSERT INTO laundry_stations (code, name, address, county, lat, lng) VALUES
  ('WL', 'Westlands Hub', 'Westlands Rd, Westlands', 'nairobi', -1.2673, 36.8071),
  ('CB', 'CBD Station', 'Moi Ave, Nairobi CBD', 'nairobi', -1.2864, 36.8172),
  ('KS', 'Kisumu Station', 'Oginga Odinga St, Kisumu', 'kisumu', -0.0917, 34.7680);

-- Saka Keja — sample rentals (Nyamasaria, Milimani, etc.)
INSERT INTO listings (
  agent_id, type, status, title, description, neighborhood, county,
  beds, baths, sqm, furnished, amenities, price_kes, price_unit,
  approx_lat, approx_lng,
  exact_address, exact_lat, exact_lng, host_name, host_phone, host_whatsapp,
  vacant
) VALUES
(
  '00000000-0000-4000-8000-000000000002', 'rental', 'published',
  'Nyamasaria 2BR Flat', 'Bright flat near main road. Water reliable.',
  'Nyamasaria', 'kisumu', 2, 1, 68, TRUE,
  ARRAY['Water 24/7', 'Parking', 'Security'],
  22000, 'month', -0.1083, 34.7634,
  'Apt 4B, Mwea Rd, Nyamasaria B', -0.1065, 34.7610,
  'Joseph O.', '+254722456789', '254722456789', TRUE
),
(
  '00000000-0000-4000-8000-000000000002', 'rental', 'published',
  'Milimani Garden Studio', 'Quiet studio, furnished.',
  'Milimani', 'kisumu', 1, 1, 42, TRUE,
  ARRAY['WiFi', 'AC', 'Kitchenette'],
  18000, 'month', -0.0816, 34.7712,
  'Plot 14, Milimani Rd', -0.0800, 34.7700,
  'Grace W.', '+254712345678', '254712345678', TRUE
),
(
  '00000000-0000-4000-8000-000000000002', 'bnb', 'published',
  'Dunga Lakeside BnB', 'Weekend getaway near the lake.',
  'Dunga Beach', 'kisumu', 3, 2, 95, TRUE,
  ARRAY['WiFi', 'Lake View', 'Kitchen'],
  5500, 'night', -0.1200, 34.7456,
  'Dunga Beach Rd', -0.1185, 34.7440,
  'Akinyi J.', '+254733567890', '254733567890', TRUE
);
