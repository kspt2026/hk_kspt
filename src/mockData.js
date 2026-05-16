const now = Date.now();

export const MOCK_USERS = [
  {
    id: 'a1b2c3d4-0001-0001-0001-000000000001',
    status: 'SAFE',
    last_seen: new Date(now - 30_000).toISOString(),
    pings: [
      { lat: 40.7128, lon: -74.006,  alt: 12,  ts: now - 30_000 },
      { lat: 40.7130, lon: -74.0062, alt: 14,  ts: now - 60_000 },
      { lat: 40.7132, lon: -74.0065, alt: 15,  ts: now - 90_000 },
    ],
  },
  {
    id: 'a1b2c3d4-0002-0002-0002-000000000002',
    status: 'DANGER',
    last_seen: new Date(now - 15_000).toISOString(),
    pings: [
      { lat: 40.7158, lon: -74.009,  alt: 28,  ts: now - 15_000 },
      { lat: 40.7158, lon: -74.009,  alt: 27,  ts: now - 45_000 },
      { lat: 40.7159, lon: -74.009,  alt: 27,  ts: now - 75_000 },
    ],
  },
  {
    id: 'a1b2c3d4-0003-0003-0003-000000000003',
    status: 'DANGER',
    last_seen: new Date(now - 5_000).toISOString(),
    pings: [
      { lat: 40.7099, lon: -74.003,  alt: 8,   ts: now - 5_000 },
      { lat: 40.7099, lon: -74.003,  alt: 8,   ts: now - 35_000 },
      { lat: 40.7100, lon: -74.003,  alt: 9,   ts: now - 65_000 },
    ],
  },
  {
    id: 'a1b2c3d4-0004-0004-0004-000000000004',
    status: 'SAFE',
    last_seen: new Date(now - 120_000).toISOString(),
    pings: [
      { lat: 40.7185, lon: -73.998,  alt: 42,  ts: now - 120_000 },
      { lat: 40.7180, lon: -73.9975, alt: 45,  ts: now - 150_000 },
      { lat: 40.7175, lon: -73.997,  alt: 48,  ts: now - 180_000 },
    ],
  },
  {
    id: 'a1b2c3d4-0005-0005-0005-000000000005',
    status: 'DANGER',
    last_seen: new Date(now - 8_000).toISOString(),
    pings: [
      { lat: 40.7065, lon: -74.011,  alt: 5,   ts: now - 8_000 },
      { lat: 40.7065, lon: -74.011,  alt: 5,   ts: now - 38_000 },
      { lat: 40.7065, lon: -74.0111, alt: 6,   ts: now - 68_000 },
    ],
  },
  {
    id: 'a1b2c3d4-0006-0006-0006-000000000006',
    status: 'INACTIVE',
    last_seen: new Date(now - 2_400_000).toISOString(),
    pings: [
      { lat: 40.7210, lon: -74.015,  alt: 18,  ts: now - 2_400_000 },
    ],
  },
];
