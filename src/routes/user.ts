import type { FastifyPluginAsync } from 'fastify'
import { getDB } from '../db'
import { haversine, manager } from '../utils'

interface PingBody {
  user_id: string
  lat: number
  lon: number
  ts: number
}

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/zones', async () => {
    const zones = await getDB().collection('danger_zones').find({ active: true }, {
      projection: { _id: 1, polygon: 1 },
    }).toArray()
    return zones.map((z) => ({ id: z._id, polygon: z.polygon }))
  })

  fastify.post<{ Body: PingBody }>('/coords', async (req) => {
    const { user_id, lat, lon, ts } = req.body
    const db = getDB()
    const pingsCol = db.collection('location_pings')
    const usersCol = db.collection('users')

    // 1. Upsert user
    await usersCol.updateOne(
      { _id: user_id as any },
      { $set: { last_seen: new Date() }, $setOnInsert: { status: 'DANGER', created_at: new Date() } },
      { upsert: true }
    )

    // 2. Insert ping
    await pingsCol.insertOne({ user_id, lat, lon, ts: new Date(ts), received_at: new Date() })

    // 3. Trim to last 10
    const keep = await pingsCol
      .find({ user_id }, { projection: { _id: 1 } })
      .sort({ received_at: -1 })
      .limit(10)
      .toArray()
    if (keep.length === 10) {
      await pingsCol.deleteMany({ user_id, _id: { $nin: keep.map((p) => p._id) } })
    }

    // 4. Fetch last 3 pings
    const recent = await pingsCol
      .find({ user_id }, { projection: { lat: 1, lon: 1 } })
      .sort({ received_at: -1 })
      .limit(3)
      .toArray()

    // 5. Determine status
    let status = 'DANGER'
    if (recent.length === 3) {
      const d1 = haversine(recent[0].lat, recent[0].lon, recent[1].lat, recent[1].lon)
      const d2 = haversine(recent[1].lat, recent[1].lon, recent[2].lat, recent[2].lon)
      if (d1 > 5 && d2 > 5) status = 'SAFE'
    }

    await usersCol.updateOne({ _id: user_id as any }, { $set: { status } })

    // 6. Broadcast
    manager.broadcast({ type: 'ping', user_id, lat, lon, ts, status })

    return { ok: true }
  })
}
