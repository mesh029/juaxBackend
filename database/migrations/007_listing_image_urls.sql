-- Backfill cover + gallery URLs for pilot listings (Unsplash placeholders).
UPDATE listings
SET
  cover_image_url = COALESCE(
    cover_image_url,
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'
  ),
  image_urls = CASE
    WHEN image_urls IS NULL OR cardinality(image_urls) = 0 THEN ARRAY[
      COALESCE(
        cover_image_url,
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'
      ),
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'
    ]
    ELSE image_urls
  END
WHERE cover_image_url IS NULL OR cardinality(image_urls) = 0;
