-- migrate:up
-- Remove personal data from profiles for GDPR compliance
-- We only store profile IDs and tokens, no personal data like email, name, avatar
ALTER TABLE profiles DROP COLUMN data;

-- migrate:down
ALTER TABLE profiles ADD COLUMN data jsonb

