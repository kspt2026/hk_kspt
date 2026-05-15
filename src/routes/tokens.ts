import type { FastifyPluginAsync } from 'fastify'
import { getDB } from '../db'

interface TokenBody {
  user_id: string
  token: string
}

export const tokenRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: TokenBody }>('/device-token', async (req) => {
    const { user_id, token } = req.body
    await getDB().collection('device_tokens').updateOne(
      { user_id },
      { $set: { token, updated_at: new Date() } },
      { upsert: true }
    )
    return { ok: true }
  })
}
