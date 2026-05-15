import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { pool } from './db'
import { manager } from './utils'
import { adminRoutes } from './routes/admin'
import { userRoutes } from './routes/user'
import { rescueRoutes } from './routes/rescue'

const fastify = Fastify({ logger: true })

async function start() {
  await fastify.register(cors, { origin: '*' })
  await fastify.register(websocket)
  await fastify.register(adminRoutes)
  await fastify.register(userRoutes)
  await fastify.register(rescueRoutes)

  setInterval(async () => {
    try {
      const result = await pool.query(
        `UPDATE users SET status = 'INACTIVE'
         WHERE last_seen < now() - INTERVAL '30 minutes'
           AND status != 'INACTIVE'
         RETURNING id`
      )
      for (const row of result.rows) {
        manager.broadcast({ type: 'status_change', user_id: row.id, status: 'INACTIVE' })
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
