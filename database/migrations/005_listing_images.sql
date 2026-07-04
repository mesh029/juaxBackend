-- Listing image URLs (cover + gallery)

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';
