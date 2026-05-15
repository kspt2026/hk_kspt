import type { FastifyPluginAsync } from 'fastify'
import type { WebSocket } from 'ws'
import { manager } from '../utils'

export const rescueRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ws/rescue', { websocket: true }, (socket: WebSocket) => {
    manager.add(socket)
    socket.on('close', () => manager.remove(socket))
  })
}
