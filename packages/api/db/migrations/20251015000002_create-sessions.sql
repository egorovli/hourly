-- migrate:up
CREATE TABLE sessions (
	id         uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
	data       jsonb NOT NULL,

	expires_at timestamptz,

	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

-- migrate:down
DROP TABLE sessions;
