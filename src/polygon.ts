import type { Zone } from './types'

function pointInPolygon(lat: number, lon: number, coordinates: number[][]): boolean {
  let inside = false
  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const [xi, yi] = coordinates[i]
    const [xj, yj] = coordinates[j]
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

export function isInsideAnyZone(lat: number, lon: number, zones: Zone[]): boolean {
  return zones.some(z => pointInPolygon(lat, lon, z.polygon.coordinates[0]))
}
