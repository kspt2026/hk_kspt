import type { FastifyPluginAsync } from 'fastify'
import { pool } from '../db'

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/admin/zones', async (req, reply) => {
    const { polygon } = req.body as { polygon: object }
    const result = await pool.query(
      `INSERT INTO danger_zones (polygon)
       VALUES (ST_GeomFromGeoJSON($1))
       RETURNING id, active`,
      [JSON.stringify(polygon)]
    )
    return result.rows[0]
  })

  fastify.delete<{ Params: { zone_id: string } }>('/admin/zones/:zone_id', async (req, reply) => {
    const { zone_id } = req.params
    const result = await pool.query(
      `UPDATE danger_zones SET active = false WHERE id = $1`,
      [zone_id]
    )
    if (result.rowCount === 0) {
      reply.status(404)
      return { error: 'Zone not found' }
    }
    return { ok: true }
  })

  fastify.get('/admin/users', async () => {
    const result = await pool.query(`
      SELECT
        u.id,
        u.status,
        u.last_seen,
        COALESCE(
          (
            SELECT json_agg(row_to_json(p))
            FROM (
              SELECT lat, lon, ts
              FROM location_pings
              WHERE user_id = u.id
              ORDER BY received_at DESC
              LIMIT 10
            ) p
          ),
          '[]'::json
        ) AS pings
      FROM users u
      ORDER BY u.last_seen DESC NULLS LAST
    `)
    return result.rows.map((row) => ({
      ...row,
      last_seen: row.last_seen?.toISOString() ?? null,
    }))
  })
}
