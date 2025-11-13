-- migrate:up
CREATE TABLE profiles (
	id         text  NOT NULL,
	provider   text  NOT NULL,
	data       jsonb NOT NULL,

	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),

	PRIMARY KEY (id, provider)
);

-- migrate:down
DROP TABLE profiles;
