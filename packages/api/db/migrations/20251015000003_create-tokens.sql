-- migrate:up
CREATE TABLE tokens (
	provider     text NOT NULL,
	profile_id   text NOT NULL,

	access_token  text         NOT NULL,
	refresh_token text,
	expires_at    timestamptz,
	scopes        text[]       NOT NULL DEFAULT '{}',

	created_at   timestamptz NOT NULL DEFAULT now(),
	updated_at   timestamptz NOT NULL DEFAULT now(),

	PRIMARY KEY (profile_id, provider),
	FOREIGN KEY (profile_id, provider) REFERENCES profiles(id, provider) ON UPDATE CASCADE ON DELETE CASCADE
);

-- migrate:down
DROP TABLE tokens;
