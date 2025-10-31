-- migrate:up
CREATE TABLE profiles (
	id         TEXT NOT NULL,
	provider   TEXT NOT NULL,
	data       TEXT NOT NULL,

	created_at REAL NOT NULL,
	updated_at REAL NOT NULL,

	PRIMARY KEY (id, provider)
);

-- migrate:down
DROP TABLE profiles;
