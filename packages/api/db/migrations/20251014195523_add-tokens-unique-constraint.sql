-- migrate:up
CREATE UNIQUE INDEX idx_tokens_profile_provider ON tokens(profile_id, provider);

-- migrate:down
DROP INDEX idx_tokens_profile_provider;
