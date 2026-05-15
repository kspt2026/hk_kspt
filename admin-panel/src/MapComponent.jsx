import { useRef, useImperativeHandle, forwardRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';

function makeIcon(color, pulse = false) {
  const html = `
    <div class="relative flex items-center justify-center ${pulse ? 'marker-pulse' : ''}" style="width:20px;height:20px;">
      <div style="
        width:14px;height:14px;border-radius:50%;
        background:${color};
        border:2px solid rgba(255,255,255,0.8);
        box-shadow:0 0 6px ${color};
      "></div>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
}

const STATUS_ICONS = {
  DANGER:   makeIcon('#ef4444', true),
  SAFE:     makeIcon('#22c55e'),
  INACTIVE: makeIcon('#6b7280'),
};

function DrawHandler({ drawMode, onAddPoint }) {
  useMapEvents({
    click(e) {
      if (!drawMode) return;
      onAddPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapController({ controllerRef }) {
  const map = useMap();
  useImperativeHandle(controllerRef, () => ({
    panTo(lat, lng) { map.flyTo([lat, lng], 16, { duration: 1 }); },
  }));
  return null;
}

function ZonePolygon({ zone, onDeleteZone }) {
  const { positions } = zone;

  const center = positions.reduce(
    (acc, [lat, lng]) => [acc[0] + lat / positions.length, acc[1] + lng / positions.length],
    [0, 0]
  );

  return (
    <>
      <Polygon
        positions={positions}
        pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.12, weight: 2 }}
      />
      <Marker
        position={center}
        icon={L.divIcon({
          html: `<div style="
            background:#7f1d1d;color:#fca5a5;font-size:10px;font-weight:700;
            padding:2px 7px;border-radius:4px;white-space:nowrap;
            border:1px solid #ef4444;box-shadow:0 1px 4px rgba(0,0,0,0.7);
            font-family:monospace;
          ">${zone.name}</div>`,
          className: '',
          iconAnchor: [35, 10],
        })}
      >
        <Popup>
          <div style={{ minWidth: '160px', fontFamily: 'monospace' }}>
            <p style={{ fontWeight: 700, marginBottom: '4px', color: '#ef4444' }}>{zone.name}</p>
            <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>
              id: …{zone.id.slice(-8)}
            </p>
            <button
              onClick={() => onDeleteZone(zone.id)}
              style={{
                width: '100%', padding: '5px 8px',
                background: '#b91c1c', color: '#fff',
                border: 'none', borderRadius: '4px',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Delete Zone
            </button>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

const DEFAULT_CENTER = [50.45, 30.52];
const SHORT_ID = (id) => id.slice(-8);

const MapComponent = forwardRef(function MapComponent(
  { drawMode, points, onAddPoint, users, zones, onDeleteZone },
  ref
) {
  const controllerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    panTo(lat, lng) { controllerRef.current?.panTo(lat, lng); },
  }));

  const draftPositions = points.map((p) => [p.lat, p.lng]);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={13}
      className="w-full h-full"
      style={{ cursor: drawMode ? 'crosshair' : 'grab' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        maxZoom={19}
      />

      <MapController controllerRef={controllerRef} />
      <DrawHandler drawMode={drawMode} onAddPoint={onAddPoint} />

      {zones.map((z) => (
        <ZonePolygon key={z.id} zone={z} onDeleteZone={onDeleteZone} />
      ))}

      {draftPositions.length >= 2 && (
        <Polygon
          positions={draftPositions}
          pathOptions={{
            color: '#f97316',
            fillColor: '#f97316',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: draftPositions.length < 3 ? '6 4' : undefined,
          }}
        />
      )}

      {points.map((p, i) => (
        <Marker key={`draft-${i}`} position={[p.lat, p.lng]} icon={makeIcon('#f97316')}>
          <Popup>Point {i + 1}: {p.lat.toFixed(5)}, {p.lng.toFixed(5)}</Popup>
        </Marker>
      ))}

      {users.map((u) => (
        <Marker
          key={u.id}
          position={[u.lat, u.lng]}
          icon={STATUS_ICONS[u.status] ?? STATUS_ICONS.INACTIVE}
        >
          <Popup>
            <div style={{ fontFamily: 'monospace', minWidth: '160px' }}>
              <p style={{ fontWeight: 700, marginBottom: '3px' }}>…{SHORT_ID(u.id)}</p>
              <p style={{
                color:
                  u.status === 'DANGER'   ? '#ef4444' :
                  u.status === 'SAFE'     ? '#22c55e' : '#6b7280',
                fontWeight: 700, marginBottom: '4px',
              }}>
                {u.status}
              </p>
              <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                {u.lat.toFixed(5)}, {u.lng.toFixed(5)}
              </p>
              {u.pings?.length > 0 && (
                <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                  {u.pings.length} ping{u.pings.length !== 1 ? 's' : ''} recorded
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
});

export default MapComponent;
