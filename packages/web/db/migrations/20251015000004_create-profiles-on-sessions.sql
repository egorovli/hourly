-- migrate:up
CREATE TYPE profile_connection_type AS ENUM ('worklog-target', 'data-source');

CREATE TABLE profiles_on_sessions (
	profile_id       text NOT NULL,
	profile_provider text NOT NULL,
	session_id       text NOT NULL,
	connection_type  profile_connection_type NOT NULL,

	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),

	PRIMARY KEY (profile_id, profile_provider, session_id),
	FOREIGN KEY (profile_id, profile_provider) REFERENCES profiles(id, provider) ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY (session_id) REFERENCES sessions(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_profiles_on_sessions_session_id ON profiles_on_sessions(session_id);
CREATE INDEX idx_profiles_on_sessions_profile ON profiles_on_sessions(profile_id, profile_provider);
CREATE INDEX idx_profiles_on_sessions_connection_type ON profiles_on_sessions(connection_type);

-- migrate:down
DROP TABLE profiles_on_sessions;
DROP TYPE profile_connection_type;

