import type { FastifyPluginAsync } from 'fastify'
import { getDB } from '../db'
import { sendZonesUpdatedPush } from '../firebase'

async function getAllTokens(): Promise<string[]> {
  const docs = await getDB().collection('device_tokens').find({}, { projection: { token: 1 } }).toArray()
  return docs.map((d) => d.token).filter(Boolean)
}

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/admin/zones', async (req) => {
    const { polygon } = req.body as { polygon: object }
    const id = crypto.randomUUID()
    await getDB().collection('danger_zones').insertOne({ _id: id as any, polygon, active: true, created_at: new Date() })
    sendZonesUpdatedPush(await getAllTokens()).catch(() => {})
    return { id, active: true }
  })

  fastify.delete<{ Params: { zone_id: string } }>('/admin/zones/:zone_id', async (req, reply) => {
    const result = await getDB().collection('danger_zones').updateOne(
      { _id: req.params.zone_id as any },
      { $set: { active: false } }
    )
    if (result.matchedCount === 0) {
      reply.status(404)
      return { error: 'Zone not found' }
    }
    sendZonesUpdatedPush(await getAllTokens()).catch(() => {})
    return { ok: true }
  })

  fastify.get('/admin/users', async () => {
    const users = await getDB().collection('users').aggregate([
      {
        $lookup: {
          from: 'location_pings',
          let: { uid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$user_id', '$$uid'] } } },
            { $sort: { received_at: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, lat: 1, lon: 1, ts: 1 } },
          ],
          as: 'pings',
        },
      },
      { $sort: { last_seen: -1 } },
    ]).toArray()

    return users.map((u) => ({
      id: u._id,
      status: u.status,
      last_seen: u.last_seen ?? null,
      pings: u.pings,
    }))
  })
}
