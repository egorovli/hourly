-- migrate:up
CREATE INDEX idx_profiles_provider_reported_at_updated_at
  ON profiles (provider, reported_at, updated_at DESC);

-- migrate:down
DROP INDEX IF EXISTS idx_profiles_provider_reported_at_updated_at;
