-- PostGIS admin boundaries for county/region resolution (Kenya pilot → all counties)

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS admin_areas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code CHAR(2) NOT NULL DEFAULT 'KE',
  level        TEXT NOT NULL,
  slug         TEXT NOT NULL,
  name         TEXT NOT NULL,
  code         INT,
  boundary     GEOGRAPHY(MULTIPOLYGON, 4326) NOT NULL,
  center       GEOGRAPHY(POINT, 4326),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, level, slug)
);

CREATE INDEX IF NOT EXISTS idx_admin_areas_boundary ON admin_areas USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_admin_areas_lookup ON admin_areas (country_code, level, slug);

-- Spatial index on listing approx pins (expression index for ST_DWithin queries)
CREATE INDEX IF NOT EXISTS idx_listings_approx_geog ON listings USING GIST (
  (ST_SetSRID(ST_MakePoint(approx_lng, approx_lat), 4326)::geography)
);
