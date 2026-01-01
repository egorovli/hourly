-- migrate:up
ALTER TABLE profiles ADD COLUMN reported_at timestamptz;

-- migrate:down
ALTER TABLE profiles DROP COLUMN reported_at;
