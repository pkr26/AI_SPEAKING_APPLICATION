-- Shared fixed-window counters keep rate limits effective across API replicas.
-- Client identifiers are HMACed in the application before they reach this
-- table, so raw IP addresses and user IDs are not retained here.

CREATE TABLE rate_limit_windows (
  namespace TEXT NOT NULL CHECK (length(namespace) BETWEEN 1 AND 80),
  key_hash CHAR(64) NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  hits BIGINT NOT NULL CHECK (hits >= 0),
  reset_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (namespace, key_hash)
);

CREATE INDEX idx_rate_limit_windows_reset_at
  ON rate_limit_windows (reset_at);
