CREATE TABLE IF NOT EXISTS "schema_migrations" (version varchar(128) primary key);
CREATE TABLE profiles (
	id         TEXT NOT NULL,
	provider   TEXT NOT NULL,
	data       TEXT NOT NULL,

	created_at REAL NOT NULL,
	updated_at REAL NOT NULL,

	PRIMARY KEY (id, provider)
);
CREATE TABLE sessions (
	id         TEXT PRIMARY KEY NOT NULL,
	data       TEXT NOT NULL,

	expires_at REAL,

	created_at REAL NOT NULL,
	updated_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS "tokens" (
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
-- Dbmate schema migrations
INSERT INTO "schema_migrations" (version) VALUES
  ('20251014181134'),
  ('20251014181628'),
  ('20251014185511'),
  ('20251014190025'),
  ('20251014195523'),
  ('20251014195750');
