-- migrate:up
CREATE TABLE sessions (
	id         TEXT PRIMARY KEY NOT NULL,
	data       TEXT NOT NULL,

	expires_at REAL,

	created_at REAL NOT NULL,
	updated_at REAL NOT NULL
);

-- migrate:down
DROP TABLE sessions;

