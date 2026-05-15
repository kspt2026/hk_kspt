import type { WebSocket } from 'ws'

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dphi = ((lat2 - lat1) * Math.PI) / 180
  const dlambda = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

class ConnectionManager {
  private clients = new Set<WebSocket>()

  add(ws: WebSocket): void {
    this.clients.add(ws)
  }

  remove(ws: WebSocket): void {
    this.clients.delete(ws)
  }

  broadcast(data: object): void {
    const msg = JSON.stringify(data)
    for (const ws of this.clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(msg)
      } else {
        this.clients.delete(ws)
      }
    }
  }
}

export const manager = new ConnectionManager()
