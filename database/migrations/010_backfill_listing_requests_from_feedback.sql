-- Backfill legacy listing requests from service_feedback into listing_requests.
-- Safe to rerun: inserts only when (user_id, listing_id) pair is missing.

INSERT INTO listing_requests (user_id, listing_id, kind, status, user_note, created_at, updated_at)
SELECT
  sf.user_id,
  sf.listing_id,
  CASE
    WHEN sf.service = 'rental' THEN 'viewing'::listing_request_kind
    WHEN sf.service = 'bnb' THEN 'tour'::listing_request_kind
    ELSE 'stay'::listing_request_kind
  END AS kind,
  CASE
    WHEN sf.status = 'resolved' THEN 'viewing_completed'::listing_request_status
    WHEN sf.status = 'reviewed' THEN 'agent_contacted'::listing_request_status
    ELSE 'requested'::listing_request_status
  END AS status,
  sf.body AS user_note,
  sf.created_at,
  sf.updated_at
FROM service_feedback sf
WHERE sf.listing_id IS NOT NULL
  AND sf.category = 'suggestion'
  AND NOT EXISTS (
    SELECT 1
    FROM listing_requests lr
    WHERE lr.user_id = sf.user_id
      AND lr.listing_id = sf.listing_id
  );

INSERT INTO listing_request_messages (request_id, sender_role, body, created_at)
SELECT
  lr.id,
  'system'::listing_message_sender,
  'Imported from legacy listing request feedback.',
  lr.created_at
FROM listing_requests lr
WHERE NOT EXISTS (
  SELECT 1 FROM listing_request_messages m WHERE m.request_id = lr.id
);
