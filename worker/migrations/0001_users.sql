-- WaddlePlay auth store.
-- Credentials live in D1 (not Sanity) because the Sanity free plan only
-- supports PUBLIC datasets, which would expose these rows to anyone.
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
