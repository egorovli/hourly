-- migrate:up
ALTER TABLE profiles ADD COLUMN deleted_at timestamptz;
ALTER TABLE profiles ALTER COLUMN data DROP NOT NULL;

-- Replace existing reporting index with one that excludes soft-deleted profiles
DROP INDEX idx_profiles_provider_reported_at_updated_at_active;
DROP INDEX idx_profiles_provider_reported_at_updated_at;

CREATE INDEX idx_profiles_provider_reported_at_updated_at_active
  ON profiles (provider, reported_at, updated_at DESC)
  WHERE deleted_at IS NULL;

-- migrate:down
DROP INDEX idx_profiles_provider_reported_at_updated_at_active;

CREATE INDEX idx_profiles_provider_reported_at_updated_at
  ON profiles (provider, reported_at, updated_at DESC);

-- Ensure legacy NOT NULL constraint can be reapplied even if rows were soft-deleted
UPDATE profiles SET data = '{}'::jsonb WHERE data IS NULL;

ALTER TABLE profiles ALTER COLUMN data SET NOT NULL;
ALTER TABLE profiles DROP COLUMN deleted_at;
