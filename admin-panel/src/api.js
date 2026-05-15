export const API_BASE_URL = 'http://localhost:3000';
export const WS_BASE_URL  = 'ws://localhost:3000';

export function pointsToGeoJSON(points) {
  const coords = points.map((p) => [p.lng, p.lat]);
  coords.push(coords[0]);
  return { type: 'Polygon', coordinates: [coords] };
}

export async function getAdminUsers() {
  const res = await fetch(`${API_BASE_URL}/admin/users`);
  if (!res.ok) throw new Error(`GET /admin/users failed: ${res.status}`);
  return res.json();
}

export async function getZones() {
  const res = await fetch(`${API_BASE_URL}/zones`);
  if (!res.ok) throw new Error(`GET /zones failed: ${res.status}`);
  return res.json();
}

export async function postZone(name, points) {
  const polygon = pointsToGeoJSON(points);
  const res = await fetch(`${API_BASE_URL}/admin/zones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, polygon }),
  });
  if (!res.ok) throw new Error(`POST /admin/zones failed: ${res.status}`);
  return res.json();
}

export async function deleteZone(zoneId) {
  const res = await fetch(`${API_BASE_URL}/admin/zones/${zoneId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE /admin/zones/${zoneId} failed: ${res.status}`);
  return res.json();
}
