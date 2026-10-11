-- Sensitive operational data stays in private D1, never the public content dataset.
CREATE TABLE notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  messages INTEGER NOT NULL DEFAULT 1,
  playdates INTEGER NOT NULL DEFAULT 1,
  community INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE push_devices (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX push_devices_user ON push_devices(user_id);
CREATE TABLE user_locations (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE verification_requests (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
  statement TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewer_id TEXT,
  reason TEXT,
  review_locked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX verification_pending ON verification_requests(status, submitted_at);
CREATE TABLE user_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  route TEXT NOT NULL,
  created_at TEXT NOT NULL,
  unread INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX user_notifications_owner ON user_notifications(user_id, created_at DESC);
CREATE TABLE push_jobs (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL REFERENCES user_notifications(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  ticket_id TEXT,
  error TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(notification_id, token)
);
CREATE INDEX push_jobs_due ON push_jobs(status, next_attempt_at);
CREATE TABLE feature_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
