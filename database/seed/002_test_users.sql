-- Test users: 1 admin, 2 agents, 1 normal user (OTP-only, no password)
INSERT INTO users (id, phone_e164, display_name, role, county) VALUES
  ('00000000-0000-4000-8000-000000000003', '+254700000003', 'Milimani Agent', 'agent', 'kisumu'),
  ('00000000-0000-4000-8000-000000000004', '+254700000004', 'Test User', 'user', 'kisumu')
ON CONFLICT (phone_e164) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  county = EXCLUDED.county;
