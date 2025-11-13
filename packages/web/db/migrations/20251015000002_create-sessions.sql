-- migrate:up
CREATE TABLE sessions (
	id         text  PRIMARY KEY DEFAULT gen_random_uuid()::text,
	data       jsonb NOT NULL,

	expires_at timestamptz,

	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

-- migrate:down
DROP TABLE sessions;
