-- Removes the throwaway accounts created by scripts/smoke.mjs.
-- Their Sanity-side documents (family profile, playdate, notifications, ...)
-- are removed by scripts/cleanup-test-data.ts.
DELETE FROM users
WHERE email LIKE 'smoke-%@waddleplay.com';
