You are building the backend for a disaster victim tracking system called RescueGrid.

## Project description

When a city declares a danger zone (collapsed building, missile strike, etc.), phones inside that zone automatically begin sending GPS coordinates to rescue services. The backend sits between three actors: Admin (city emergency office), User (citizen phone), Rescuer (reads live coordinates on a map panel).

Privacy principle: user location is only stored after their phone detects it is inside a declared danger zone. Before that, nothing is stored server-side. The phone does the geofence check locally using the zone polygons it fetches.

## Tech stack

- FastAPI (Python)
- PostgreSQL + PostGIS (spatial queries)
- asyncpg or databases lib for async DB access
- uvicorn

## Data models

### danger_zones table
```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE danger_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  polygon GEOMETRY(Polygon, 4326) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON danger_zones USING GIST (polygon);
```

### users table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'DANGER', -- DANGER | SAFE | INACTIVE
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON users (status);
```

### location_pings table
```sql
CREATE TABLE location_pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  lat FLOAT NOT NULL,
  lon FLOAT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON location_pings (user_id, received_at DESC);
```

## Endpoints

### Admin (no auth, open)

POST /admin/zones
  body: { name: str, polygon: GeoJSON Polygon }
  returns: { id, name, active }

DELETE /admin/zones/{zone_id}
  sets active = false, does not hard delete
  returns: { ok: true }

GET /admin/users
  returns all users with status + last 10 pings, newest ping first
  response shape:
  [
    {
      id: uuid,
      status: "DANGER" | "SAFE" | "INACTIVE",
      last_seen: timestamp,
      pings: [{ lat, lon, ts }]  -- last 10, newest first
    }
  ]

### User (no auth)

GET /zones
  returns list of active zones, polygons only
  response shape:
  [
    { id: uuid, polygon: GeoJSON Polygon }
  ]

POST /coords
  body: { user_id: uuid, lat: float, lon: float, ts: int (unix ms) }
  returns: { ok: true }

  server logic:
  1. Upsert user (create if first ping), set last_seen = now()
  2. Insert LocationPing
  3. Trim pings for this user to last 10 (delete oldest if count > 10)
  4. Fetch last 3 pings for this user ordered by received_at DESC
  5. If all 3 consecutive pings moved more than 5 meters from each other:
       set user.status = SAFE
     else:
       set user.status = DANGER
  6. Broadcast updated user state to all connected WebSocket rescuer clients

### WebSocket

WS /ws/rescue
  Rescuer panel connects here and receives a live stream.
  No auth, no snapshot on connect.
  Every time POST /coords is processed, broadcast to all connected rescuers:
  {
    type: "ping",
    user_id: uuid,
    lat: float,
    lon: float,
    ts: int,
    status: "DANGER" | "SAFE" | "INACTIVE"
  }
  Also broadcast status changes from the cron:
  {
    type: "status_change",
    user_id: uuid,
    status: "INACTIVE"
  }

## Background cron

Run every 5 minutes:
  For all users where last_seen < now - 30 minutes:
    set status = INACTIVE
    broadcast status_change event to WebSocket clients

## Distance calculation

Use the Haversine formula to compute distance in meters between two (lat, lon) pairs. Do not use PostGIS for this — keep it in Python so it runs in the application layer during ping processing.

## Project structure

rescuegrid-backend/
  main.py           -- FastAPI app, router includes, WebSocket manager, cron startup
  db.py             -- asyncpg connection pool, init_db()
  models.py         -- Pydantic request/response schemas
  routers/
    admin.py        -- /admin/zones, /admin/users
    user.py         -- /zones, /coords
    rescue.py       -- /ws/rescue WebSocket
  utils.py          -- haversine(), broadcast helper
  schema.sql        -- full SQL schema ready to run

## Additional requirements

- CORS open for all origins (hackathon, panels run on different ports)
- All timestamps stored as TIMESTAMPTZ in UTC
- Return GeoJSON-compatible polygon format from /zones (coordinates array, not WKT)
- Include a .env.example with DATABASE_URL
- Include a requirements.txt
- Write schema.sql as a standalone file that can be run with psql to initialize the DB from scratch
- No authentication, no user PII, device UUID is the only identity