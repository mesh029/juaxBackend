-- Archive pre-PostGIS test listings that pollute Nyamira "near me" when full catalog loads.
UPDATE listings
SET status = 'archived', updated_at = NOW()
WHERE status = 'published'
  AND (
    LOWER(title) IN ('kameshika')
    OR title ILIKE 'Smoke Test%'
  );

-- Correct county labels from polygon when pins are inside a pilot county.
UPDATE listings l
SET county = a.slug, updated_at = NOW()
FROM admin_areas a
WHERE a.country_code = 'KE'
  AND a.level = 'county'
  AND l.status = 'published'
  AND ST_Contains(
    a.boundary::geometry,
    ST_SetSRID(ST_MakePoint(l.approx_lng, l.approx_lat), 4326)
  )
  AND l.county IS DISTINCT FROM a.slug;

-- Nyamira-area test listings (near town center for proximity QA).
INSERT INTO listings (
  agent_id, type, status, title, description, neighborhood, county,
  beds, baths, sqm, furnished, amenities, price_kes, price_unit,
  approx_lat, approx_lng,
  exact_address, exact_lat, exact_lng, host_name, host_phone, host_whatsapp,
  vacant
)
SELECT
  '00000000-0000-4000-8000-000000000002', 'bnb', 'published',
  'Nyamira Town Guest Cottage', 'Cozy cottage walking distance from town.',
  'Nyamira Town', 'nyamira', 2, 1, 55, TRUE,
  ARRAY['WiFi', 'Parking', 'Hot water'],
  3200, 'night', -0.5680, 34.9380,
  'Plot 12, Nyamira–Keroka Rd', -0.5678, 34.9378,
  'Mary O.', '+254711223344', '254711223344', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM listings WHERE title = 'Nyamira Town Guest Cottage' AND status = 'published'
);

INSERT INTO listings (
  agent_id, type, status, title, description, neighborhood, county,
  beds, baths, sqm, furnished, amenities, price_kes, price_unit,
  approx_lat, approx_lng,
  exact_address, exact_lat, exact_lng, host_name, host_phone, host_whatsapp,
  vacant
)
SELECT
  '00000000-0000-4000-8000-000000000002', 'bnb', 'published',
  'Keroka Road Annex', 'Quiet annex off Keroka Road — good for short stays.',
  'Keroka', 'nyamira', 1, 1, 38, TRUE,
  ARRAY['WiFi', 'Self check-in'],
  2800, 'night', -0.5590, 34.9250,
  'Keroka Rd, near market', -0.5588, 34.9248,
  'Peter M.', '+254722334455', '254722334455', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM listings WHERE title = 'Keroka Road Annex' AND status = 'published'
);

INSERT INTO listings (
  agent_id, type, status, title, description, neighborhood, county,
  beds, baths, sqm, furnished, amenities, price_kes, price_unit,
  approx_lat, approx_lng,
  exact_address, exact_lat, exact_lng, host_name, host_phone, host_whatsapp,
  vacant
)
SELECT
  '00000000-0000-4000-8000-000000000002', 'rental', 'published',
  'Ikonge 2BR Home', 'Family home near Ikonge — monthly rental.',
  'Ikonge', 'nyamira', 2, 1, 72, FALSE,
  ARRAY['Water tank', 'Compound', 'Parking'],
  15000, 'month', -0.5620, 34.9420,
  'Ikonge village, off main road', -0.5618, 34.9418,
  'James K.', '+254733445566', '254733445566', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM listings WHERE title = 'Ikonge 2BR Home' AND status = 'published'
);
