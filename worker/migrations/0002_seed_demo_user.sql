-- Demo account so the app is usable immediately.
-- Password: password123  (PBKDF2-SHA256, 100k iterations)
INSERT OR IGNORE INTO users (id, email, name, password_hash, created_at)
VALUES (
  'demo-user-1',
  'demo@waddleplay.com',
  'Demo Parent',
  'pbkdf2_sha256$100000$d2FkZGxlcGxheS1kZW1vLXNhbHQ=$2unj7kUrq7oq9dpMW/4i3s98/2Z5XrAgtk8SRuWDvIA=',
  '2026-01-01T00:00:00.000Z'
);
