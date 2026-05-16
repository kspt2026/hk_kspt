# Backend update — client migration required

Breaking and additive changes to the citizen-app API. Every client (Expo, web, native) must update. Deployed at `https://hkkspt-production.up.railway.app`.

---

## 1. `POST /coords` — now requires `alt`

### Before
```json
{ "user_id": "uuid", "lat": 50.45, "lon": 30.52, "ts": 1700000000000 }
```

### After
```json
{ "user_id": "uuid", "lat": 50.45, "lon": 30.52, "alt": 120.5, "ts": 1700000000000 }
```

`alt` = altitude in meters above sea level (number). Sourced from GPS hardware.

- Expo: `Location.getCurrentPositionAsync()` → `coords.altitude` (nullable — fall back to `0`)
- Android native: `Location.getAltitude()`
- iOS native: `CLLocation.altitude`
- Web Geolocation API: `position.coords.altitude`

If your platform has no altitude, send `0`.

---

## 2. `POST /coords` — status side-effect changed

Every coord ping now **always sets user status to `DANGER`**.

Previously: server ran a heuristic (3 pings, movement >5m twice → SAFE). **Removed.** Now only explicit endpoint can mark user safe.

Implication: if a user is SAFE and your client sends another `/coords`, server flips them back to DANGER. Intentional — sending coords implies they aren't safe anymore.

**Action:** stop calling `/coords` once user has confirmed safe. Resume only if user re-enters a danger zone OR explicitly re-engages.

---

## 3. New endpoint — `POST /user-is-safe`

Explicit safe-status marker. Replaces the old movement heuristic.

### Request
```
POST /user-is-safe
Content-Type: application/json

{ "user_id": "uuid" }
```

### Response
```json
{ "ok": true }
```

### Error responses
- `400` — `{ "error": "user_id required" }`
- `404` — `{ "error": "user not found" }` (call `/coords` first to create user)

### When to call
- User taps "I'm safe" / "I'm OK" / equivalent
- After resolving a danger situation

### Side effect
Server broadcasts `{ type: 'status_change', user_id, status: 'SAFE' }` over `/ws/rescue` WebSocket. Rescue dashboard sees the user flip to safe in real time.

---

## 4. `GET /admin/users` — pings now include `alt`

Each ping object in the `pings` array now has `alt`:

### Before
```json
{ "lat": 50.45, "lon": 30.52, "ts": "..." }
```

### After
```json
{ "lat": 50.45, "lon": 30.52, "alt": 120.5, "ts": "..." }
```

Admin UI / rescue dashboard can render altitude in user trace.

---

## 5. WebSocket payload — `/ws/rescue`

Two message shapes the rescue dashboard receives:

### `ping` (on every `/coords` call)
```json
{
  "type": "ping",
  "user_id": "uuid",
  "lat": 50.45,
  "lon": 30.52,
  "alt": 120.5,
  "ts": 1700000000000,
  "status": "DANGER"
}
```

### `status_change` (on every `/user-is-safe` call)
```json
{
  "type": "status_change",
  "user_id": "uuid",
  "status": "SAFE"
}
```

Existing `status_change` for `INACTIVE` (stale-user cron) still fires.

---

## Status state diagram

```
[create]
   │
   ▼
DANGER ◀──── POST /coords ────┐
   │                          │
   │ POST /user-is-safe       │
   ▼                          │
 SAFE ────── POST /coords ────┘
   │
   │ 30 min no activity
   ▼
INACTIVE
```

Only three states: `DANGER`, `SAFE`, `INACTIVE`.

---

## Migration checklist per client

- [ ] Add `alt` field to `/coords` payload
- [ ] Source altitude from platform GPS API (fallback `0`)
- [ ] Wire `POST /user-is-safe` on safety confirmation UI
- [ ] Stop sending `/coords` after `/user-is-safe` succeeds
- [ ] If using `/ws/rescue`: handle `status_change` with `status: 'SAFE'`
- [ ] If using `/admin/users`: render `alt` in ping list (optional)

---

## Unchanged endpoints

These still work exactly as before — no client action required:

- `GET /zones`
- `POST /device-token`
- `POST /admin/zones`
- `DELETE /admin/zones/:zone_id`
- `GET /ws/rescue` (connection contract unchanged)
- Silent push payload `{ data: { type: "zones_updated" } }` (unchanged)
