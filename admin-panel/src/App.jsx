import { useState, useEffect, useRef, useCallback } from 'react';
import MapComponent from './MapComponent';
import { getAdminUsers, getZones, postZone, deleteZone, WS_BASE_URL } from './api';

const shortId = (id) => id.slice(-8);

const formatLastSeen = (ts) => {
  if (!ts) return 'unknown';
  const diff = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
};

const toDisplayUsers = (users) =>
  users
    .filter((u) => u.pings && u.pings.length > 0)
    .map((u) => ({ ...u, lat: u.pings[0].lat, lng: u.pings[0].lon }));

const geoJsonToPositions = (polygon) =>
  polygon.coordinates[0].map(([lon, lat]) => [lat, lon]);

const STATUS_COLOR = {
  DANGER:   'text-red-400',
  SAFE:     'text-green-400',
  INACTIVE: 'text-gray-500',
};

const STATUS_CARD = {
  DANGER:   'bg-red-900/30 border-red-800',
  SAFE:     'bg-green-900/20 border-green-900',
  INACTIVE: 'bg-gray-800/40 border-gray-700',
};

const FILTERS = [
  { label: 'All',      value: 'ALL' },
  { label: 'Danger',   value: 'DANGER' },
  { label: 'Safe',     value: 'SAFE' },
  { label: 'Inactive', value: 'INACTIVE' },
];

export default function App() {
  const [users,       setUsers]       = useState([]);
  const [zones,       setZones]       = useState([]);
  const [activeTab,   setActiveTab]   = useState('users');
  const [userFilter,  setUserFilter]  = useState('ALL');
  const [drawMode,    setDrawMode]    = useState(false);
  const [points,      setPoints]      = useState([]);
  const [zoneName,    setZoneName]    = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [submitMsg,   setSubmitMsg]   = useState(null);
  const [wsLive,      setWsLive]      = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .catch((err) => console.error('Failed to load users:', err));

    getZones()
      .then((data) =>
        setZones(
          data.map((z) => ({
            id:        z.id,
            name:      `Zone …${z.id.slice(-4)}`,
            positions: geoJsonToPositions(z.polygon),
          }))
        )
      )
      .catch((err) => console.warn('Failed to load zones:', err));
  }, []);

  useEffect(() => {
    let ws;
    let retryTimeout;

    function connect() {
      try {
        ws = new WebSocket(`${WS_BASE_URL}/ws/rescue`);

        ws.onopen = () => setWsLive(true);

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);

            if (msg.type === 'ping') {
              setUsers((prev) => {
                const idx = prev.findIndex((u) => u.id === msg.user_id);
                const newPing = { lat: msg.lat, lon: msg.lon, ts: msg.ts };

                if (idx === -1) {
                  return [...prev, {
                    id:        msg.user_id,
                    status:    msg.status,
                    last_seen: new Date(msg.ts).toISOString(),
                    pings:     [newPing],
                  }];
                }

                const updated = [...prev];
                const u = { ...updated[idx] };
                u.status    = msg.status;
                u.last_seen = new Date(msg.ts).toISOString();
                u.pings     = [newPing, ...(u.pings ?? [])].slice(0, 10);
                updated[idx] = u;
                return updated;
              });
            } else if (msg.type === 'status_change') {
              setUsers((prev) =>
                prev.map((u) =>
                  u.id === msg.user_id ? { ...u, status: msg.status } : u
                )
              );
            }
          } catch {}
        };

        ws.onerror = () => {};
        ws.onclose = () => {
          setWsLive(false);
          retryTimeout = setTimeout(connect, 5000);
        };
      } catch {}
    }

    connect();
    return () => {
      clearTimeout(retryTimeout);
      ws?.close();
    };
  }, []);

  const toggleDrawMode = () => {
    setDrawMode((prev) => !prev);
    setPoints([]);
    setSubmitMsg(null);
    setActiveTab('zones');
  };

  const addPoint   = useCallback((latlng) => setPoints((p) => p.length < 4 ? [...p, latlng] : p), []);
  const undoPoint  = () => setPoints((p) => p.slice(0, -1));
  const clearDraft = () => { setPoints([]); setSubmitMsg(null); };

  const submitZone = async () => {
    if (points.length !== 4) return;
    const name = zoneName.trim() || `Zone ${Date.now()}`;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const result    = await postZone(name, points);
      const positions = points.map((p) => [p.lat, p.lng]);
      setZones((prev) => [...prev, {
        id:        result.id,
        name:      result.name ?? name,
        positions,
      }]);
      setSubmitMsg({ ok: true, text: `Zone created (id: …${result.id.slice(-8)})` });
      setPoints([]);
      setZoneName('');
      setDrawMode(false);
    } catch (err) {
      setSubmitMsg({ ok: false, text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteZone = useCallback(async (zoneId) => {
    try {
      await deleteZone(zoneId);
      setZones((prev) => prev.filter((z) => z.id !== zoneId));
    } catch (err) {
      console.error('Failed to delete zone:', err);
    }
  }, []);

  const displayUsers  = toDisplayUsers(users);
  const filteredUsers = userFilter === 'ALL'
    ? users
    : users.filter((u) => u.status === userFilter);

  const counts = {
    DANGER:   users.filter((u) => u.status === 'DANGER').length,
    SAFE:     users.filter((u) => u.status === 'SAFE').length,
    INACTIVE: users.filter((u) => u.status === 'INACTIVE').length,
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-100 overflow-hidden font-mono">
      <aside className="w-80 flex-shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">
        <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold tracking-widest text-red-400 uppercase">
              RescueGrid
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            wsLive
              ? 'bg-green-900 text-green-300'
              : 'bg-gray-800 text-gray-500'
          }`}>
            {wsLive ? 'WS LIVE' : 'DISCONNECTED'}
          </span>
        </div>

        <div className="px-4 py-2 border-b border-gray-800 flex gap-3 text-xs flex-shrink-0">
          <span className="text-gray-400">
            Total <strong className="text-white">{users.length}</strong>
          </span>
          <span className="text-red-400">
            <strong>{counts.DANGER}</strong> DANGER
          </span>
          <span className="text-green-400">
            <strong>{counts.SAFE}</strong> SAFE
          </span>
          <span className="text-gray-500">
            <strong>{counts.INACTIVE}</strong> inactive
          </span>
        </div>

        <div className="flex border-b border-gray-800 flex-shrink-0">
          {[
            { key: 'users', label: 'Users', badge: users.length || null },
            { key: 'zones', label: 'Zones', badge: zones.length || null },
          ].map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 text-xs font-semibold tracking-wide transition-colors ${
                activeTab === key
                  ? 'text-white border-b-2 border-red-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
              {badge !== null && (
                <span className="ml-1.5 bg-gray-700 text-gray-300 rounded-full px-1.5 text-xs">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'users' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex gap-1 px-3 py-2 flex-shrink-0">
              {FILTERS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setUserFilter(value)}
                  className={`flex-1 py-1 rounded text-xs font-semibold transition-colors ${
                    userFilter === value
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-gray-600 italic px-1 pt-2">No users</p>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className={`rounded px-3 py-2 border cursor-pointer hover:opacity-80 transition-opacity ${STATUS_CARD[u.status]}`}
                    onClick={() => {
                      if (u.pings?.[0]) {
                        mapRef.current?.panTo(u.pings[0].lat, u.pings[0].lon);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-bold ${STATUS_COLOR[u.status]}`}>
                        …{shortId(u.id)}
                      </p>
                      <span className={`text-xs font-bold ${STATUS_COLOR[u.status]}`}>
                        {u.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatLastSeen(u.last_seen)}
                      {u.pings?.[0] &&
                        ` · ${u.pings[0].lat.toFixed(4)}, ${u.pings[0].lon.toFixed(4)}`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0 space-y-2">
              <button
                onClick={toggleDrawMode}
                className={`w-full py-2 px-3 rounded text-sm font-semibold transition-colors ${
                  drawMode
                    ? 'bg-orange-600 hover:bg-orange-500 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                {drawMode ? 'Cancel Drawing' : '+ Draw Zone'}
              </button>

              {drawMode && (
                <>
                  <p className="text-xs text-orange-400">
                    Click map to place exactly 4 points.
                  </p>
                  <input
                    type="text"
                    placeholder="Zone name (optional)"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500"
                  />
                </>
              )}

              {points.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {points.length} point{points.length !== 1 ? 's' : ''} placed
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={undoPoint}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded"
                      >
                        Undo
                      </button>
                      <button
                        onClick={clearDraft}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {points.length === 4 && (
                    <button
                      onClick={submitZone}
                      disabled={submitting}
                      className="w-full py-2 rounded bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {submitting ? 'Creating…' : 'Submit Zone'}
                    </button>
                  )}
                </div>
              )}

              {submitMsg && (
                <p className={`text-xs rounded px-2 py-1.5 ${
                  submitMsg.ok
                    ? 'bg-green-900 text-green-300'
                    : 'bg-red-900 text-red-300'
                }`}>
                  {submitMsg.text}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {zones.length === 0 ? (
                <p className="text-xs text-gray-600 italic">No active zones</p>
              ) : (
                zones.map((z) => (
                  <div
                    key={z.id}
                    className="flex items-center justify-between bg-gray-800 rounded px-3 py-2 border border-orange-900"
                  >
                    <div className="min-w-0 mr-2">
                      <p className="text-sm font-bold text-orange-300 truncate">{z.name}</p>
                      <p className="text-xs text-gray-500 font-mono">…{z.id.slice(-8)}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteZone(z.id)}
                      className="flex-shrink-0 text-xs bg-red-900 hover:bg-red-700 text-red-300 hover:text-white px-2 py-1 rounded transition-colors font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 relative">
        <MapComponent
          ref={mapRef}
          drawMode={drawMode}
          points={points}
          onAddPoint={addPoint}
          users={displayUsers}
          zones={zones}
          onDeleteZone={handleDeleteZone}
        />

        {drawMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg z-[1000] pointer-events-none">
            DRAW MODE — {points.length}/4 points placed
            {points.length < 4 ? ` (need ${4 - points.length} more)` : ' — ready to submit'}
          </div>
        )}
      </main>
    </div>
  );
}
