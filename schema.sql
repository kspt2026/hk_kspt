CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE danger_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polygon GEOMETRY(Polygon, 4326) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON danger_zones USING GIST (polygon);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'DANGER',
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON users (status);

CREATE TABLE location_pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  lat FLOAT NOT NULL,
  lon FLOAT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON location_pings (user_id, received_at DESC);
