-- migrate:up
-- Drop the unique index (no longer needed with composite PK)
DROP INDEX idx_tokens_profile_provider;

-- Create new table with composite primary key
CREATE TABLE tokens_new (
	provider   TEXT NOT NULL,
	profile_id TEXT NOT NULL,

	created_at REAL NOT NULL,
	updated_at REAL NOT NULL,
	access_token TEXT NOT NULL DEFAULT '',
	refresh_token TEXT,
	expires_at TEXT,
	scopes TEXT NOT NULL DEFAULT '[]',

	PRIMARY KEY (profile_id, provider),
	FOREIGN KEY (profile_id, provider) REFERENCES profiles(id, provider) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Copy data from old table
INSERT INTO tokens_new (provider, profile_id, created_at, updated_at, access_token, refresh_token, expires_at, scopes)
SELECT provider, profile_id, created_at, updated_at, access_token, refresh_token, expires_at, scopes
FROM tokens;

-- Drop old table
DROP TABLE tokens;

-- Rename new table
ALTER TABLE tokens_new RENAME TO tokens;

-- migrate:down
-- Create old table structure with id as primary key
CREATE TABLE tokens_new (
	id         TEXT PRIMARY KEY NOT NULL,

	provider   TEXT NOT NULL,
	profile_id TEXT NOT NULL,

	created_at REAL NOT NULL,
	updated_at REAL NOT NULL,
	access_token TEXT NOT NULL DEFAULT '',
	refresh_token TEXT,
	expires_at TEXT,
	scopes TEXT NOT NULL DEFAULT '[]',

	FOREIGN KEY (profile_id, provider) REFERENCES profiles(id, provider) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Copy data back
INSERT INTO tokens_new (id, provider, profile_id, created_at, updated_at, access_token, refresh_token, expires_at, scopes)
SELECT id, provider, profile_id, created_at, updated_at, access_token, refresh_token, expires_at, scopes
FROM tokens;

-- Drop current table
DROP TABLE tokens;

-- Rename
ALTER TABLE tokens_new RENAME TO tokens;

-- Recreate unique index
CREATE UNIQUE INDEX idx_tokens_profile_provider ON tokens(profile_id, provider);
