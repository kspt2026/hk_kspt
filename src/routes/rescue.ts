import type { FastifyPluginAsync } from 'fastify'
import type { SocketStream } from '@fastify/websocket'
import { manager } from '../utils'

export const rescueRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ws/rescue', { websocket: true }, (connection: SocketStream) => {
    manager.add(connection.socket)
    connection.socket.on('close', () => manager.remove(connection.socket))
  })
}
