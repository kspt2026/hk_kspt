import { API } from './constants'
import type { Zone } from './types'

export async function fetchZones(): Promise<Zone[]> {
  const res = await fetch(`${API}/zones`)
  if (!res.ok) throw new Error(`fetchZones ${res.status}`)
  return res.json()
}

export async function registerToken(userId: string, token: string): Promise<void> {
  await fetch(`${API}/device-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, token }),
  })
}

export async function postCoords(userId: string, lat: number, lon: number): Promise<void> {
  await fetch(`${API}/coords`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, lat, lon, ts: Date.now() }),
  })
}
