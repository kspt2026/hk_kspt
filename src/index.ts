import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { connectDB, getDB } from './db'
import { manager } from './utils'
import { adminRoutes } from './routes/admin'
import { userRoutes } from './routes/user'
import { rescueRoutes } from './routes/rescue'
import { tokenRoutes } from './routes/tokens'

const fastify = Fastify({ logger: true })

async function start() {
  await connectDB()

  await fastify.register(cors, { origin: '*' })
  await fastify.register(websocket)
  await fastify.register(adminRoutes)
  await fastify.register(userRoutes)
  await fastify.register(rescueRoutes)
  await fastify.register(tokenRoutes)

  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000)
      const stale = await getDB().collection('users').find(
        { last_seen: { $lt: cutoff }, status: { $ne: 'INACTIVE' } },
        { projection: { _id: 1 } }
      ).toArray()

      if (stale.length === 0) return

      await getDB().collection('users').updateMany(
        { _id: { $in: stale.map((u) => u._id) } },
        { $set: { status: 'INACTIVE' } }
      )

      for (const u of stale) {
        manager.broadcast({ type: 'status_change', user_id: u._id, status: 'INACTIVE' })
      }
    } catch (err) {
      fastify.log.error(err, 'inactivity cron failed')
    }
  }, 5 * 60 * 1000)

  const port = parseInt(process.env.PORT ?? '3000', 10)
  await fastify.listen({ port, host: '0.0.0.0' })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
