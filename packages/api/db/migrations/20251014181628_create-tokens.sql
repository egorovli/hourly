-- migrate:up
CREATE TABLE tokens (
	id         TEXT PRIMARY KEY NOT NULL,

	provider   TEXT NOT NULL,
	profile_id TEXT NOT NULL,

	created_at REAL NOT NULL,
	updated_at REAL NOT NULL,

	FOREIGN KEY (profile_id, provider) REFERENCES profiles(id, provider) ON UPDATE CASCADE ON DELETE CASCADE
);

-- migrate:down
DROP TABLE tokens;