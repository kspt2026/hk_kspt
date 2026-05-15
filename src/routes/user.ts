import type { FastifyPluginAsync } from 'fastify'
import { pool } from '../db'
import { haversine, manager } from '../utils'

interface PingBody {
  user_id: string
  lat: number
  lon: number
  ts: number
}

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/zones', async () => {
    const result = await pool.query(
      `SELECT id, ST_AsGeoJSON(polygon)::text AS polygon
       FROM danger_zones WHERE active = true`
    )
    return result.rows.map((row) => ({
      id: row.id,
      polygon: JSON.parse(row.polygon),
    }))
  })

  fastify.post<{ Body: PingBody }>('/coords', async (req) => {
    const { user_id, lat, lon, ts } = req.body
    const tsDate = new Date(ts)

    // 1. Upsert user
    await pool.query(
      `INSERT INTO users (id, status, last_seen) VALUES ($1, 'DANGER', now())
       ON CONFLICT (id) DO UPDATE SET last_seen = now()`,
      [user_id]
    )

    // 2. Insert ping
    await pool.query(
      `INSERT INTO location_pings (user_id, lat, lon, ts) VALUES ($1, $2, $3, $4)`,
      [user_id, lat, lon, tsDate]
    )

    // 3. Trim to last 10
    await pool.query(
      `DELETE FROM location_pings
       WHERE user_id = $1
         AND id NOT IN (
           SELECT id FROM location_pings
           WHERE user_id = $1
           ORDER BY received_at DESC
           LIMIT 10
         )`,
      [user_id]
    )

    // 4. Fetch last 3 pings
    const pingsResult = await pool.query<{ lat: number; lon: number }>(
      `SELECT lat, lon FROM location_pings
       WHERE user_id = $1
       ORDER BY received_at DESC
       LIMIT 3`,
      [user_id]
    )
    const pings = pingsResult.rows

    // 5. Determine status — all 3 consecutive gaps must exceed 5 m
    let status = 'DANGER'
    if (pings.length === 3) {
      const d1 = haversine(pings[0].lat, pings[0].lon, pings[1].lat, pings[1].lon)
      const d2 = haversine(pings[1].lat, pings[1].lon, pings[2].lat, pings[2].lon)
      if (d1 > 5 && d2 > 5) status = 'SAFE'
    }

    await pool.query(`UPDATE users SET status = $1 WHERE id = $2`, [status, user_id])

    // 6. Broadcast to rescuer panel
    manager.broadcast({ type: 'ping', user_id, lat, lon, ts, status })

    return { ok: true }
  })
}
