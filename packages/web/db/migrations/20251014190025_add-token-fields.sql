-- migrate:up
ALTER TABLE tokens ADD COLUMN access_token TEXT NOT NULL DEFAULT '';
ALTER TABLE tokens ADD COLUMN refresh_token TEXT;
ALTER TABLE tokens ADD COLUMN expires_at TEXT;
ALTER TABLE tokens ADD COLUMN scopes TEXT NOT NULL DEFAULT '[]';

-- migrate:down
ALTER TABLE tokens DROP COLUMN access_token;
ALTER TABLE tokens DROP COLUMN refresh_token;
ALTER TABLE tokens DROP COLUMN expires_at;
ALTER TABLE tokens DROP COLUMN scopes;

