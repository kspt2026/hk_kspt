import type { FastifyPluginAsync } from 'fastify'
import { getDB } from '../db'
import { manager } from '../utils'

interface PingBody {
  user_id: string
  lat: number
  lon: number
  alt: number
  ts: number
}

interface SafeBody {
  user_id: string
}

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/zones', async () => {
    const zones = await getDB().collection('danger_zones').find({ active: true }, {
      projection: { _id: 1, polygon: 1 },
    }).toArray()
    return zones.map((z) => ({ id: z._id, polygon: z.polygon }))
  })

  fastify.post<{ Body: PingBody }>('/coords', async (req) => {
    const { user_id, lat, lon, alt, ts } = req.body
    const db = getDB()
    const pingsCol = db.collection('location_pings')
    const usersCol = db.collection('users')

    await usersCol.updateOne(
      { _id: user_id as any },
      {
        $set: { status: 'DANGER', last_seen: new Date() },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true }
    )

    await pingsCol.insertOne({ user_id, lat, lon, alt, ts: new Date(ts), received_at: new Date() })

    const keep = await pingsCol
      .find({ user_id }, { projection: { _id: 1 } })
      .sort({ received_at: -1 })
      .limit(10)
      .toArray()
    if (keep.length === 10) {
      await pingsCol.deleteMany({ user_id, _id: { $nin: keep.map((p) => p._id) } })
    }

    manager.broadcast({ type: 'ping', user_id, lat, lon, alt, ts, status: 'DANGER' })

    return { ok: true }
  })

  fastify.post<{ Body: SafeBody }>('/user-is-safe', async (req, reply) => {
    const { user_id } = req.body
    if (!user_id) {
      reply.status(400)
      return { error: 'user_id required' }
    }

    const result = await getDB().collection('users').updateOne(
      { _id: user_id as any },
      { $set: { status: 'SAFE', last_seen: new Date() } }
    )

    if (result.matchedCount === 0) {
      reply.status(404)
      return { error: 'user not found' }
    }

    manager.broadcast({ type: 'status_change', user_id, status: 'SAFE' })

    return { ok: true }
  })
}
