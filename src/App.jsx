// MIGRATION NOTE: Panel JSX shell migrated to HeroUI primitives + Framer Motion.
// All state, effects, handlers, API calls, and MapComponent props/ref unchanged.
// Map block reordered to left (flex-1) per target layout; map JSX itself untouched.
// Panel width preserved at w-80 (existing value, not spec's 420px default).
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card, Input, Button, Chip, Separator,
  Tabs, TabList, Tab, TabPanel, ScrollShadow,
} from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
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
  DANGER:   'text-red-500',
  SAFE:     'text-green-500',
  INACTIVE: 'text-neutral-400',
};

const STATUS_CARD = {
  DANGER:   'bg-red-600/20 border-white/10',
  SAFE:     'bg-green-900/20 border-white/10',
  INACTIVE: 'border-white/10',
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
  const [hideInactive, setHideInactive] = useState(
    () => localStorage.getItem('hideInactive') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('hideInactive', String(hideInactive));
  }, [hideInactive]);
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
                const newPing = { lat: msg.lat, lon: msg.lon, alt: msg.alt, ts: msg.ts };

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

  const visibleUsers = hideInactive
    ? users.filter((u) => u.status !== 'INACTIVE')
    : users;
  const displayUsers  = toDisplayUsers(visibleUsers);
  const filteredUsers = userFilter === 'ALL'
    ? visibleUsers
    : visibleUsers.filter((u) => u.status === userFilter);

  const counts = {
    DANGER:   users.filter((u) => u.status === 'DANGER').length,
    SAFE:     users.filter((u) => u.status === 'SAFE').length,
    INACTIVE: users.filter((u) => u.status === 'INACTIVE').length,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0f] text-white">
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

      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-80 flex-shrink-0 h-full overflow-y-auto border-l border-white/10 bg-[#0a0a0f]"
      >
        <Card variant="flat" className="rounded-none border-0 bg-transparent">
          <Card.Header className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-bold tracking-widest text-white lowercase">
                backtrace
              </span>
            </div>
            <Chip size="sm" variant="soft" color={wsLive ? 'success' : 'default'}>
              {wsLive ? 'ONLINE' : 'DISCONNECTED'}
            </Chip>
          </Card.Header>

          <Separator />

          <Card.Content className="px-4 py-2 flex flex-row gap-3 text-xs">
            <span className="text-neutral-400">
              Total <strong className="text-white">{users.length}</strong>
            </span>
            <span className="text-red-500">
              <strong>{counts.DANGER}</strong> DANGER
            </span>
            <span className="text-green-500">
              <strong>{counts.SAFE}</strong> SAFE
            </span>
            <span className="text-neutral-400">
              <strong>{counts.INACTIVE}</strong> inactive
            </span>
          </Card.Content>

          <Separator />
        </Card>

        <div className="px-3 pt-3">
          <Tabs
            aria-label="Panel sections"
            variant="solid"
            color="default"
            classNames={{ cursor: "bg-default-300" }}
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(String(key))}
          >
            <TabList className="w-full">
              <Tab id="users" className="flex-1">
                <div className="flex items-center justify-center gap-1.5">
                  <span>Users</span>
                  {users.length > 0 && (
                    <Chip size="sm" variant="soft">{users.length}</Chip>
                  )}
                </div>
              </Tab>
              <Tab id="zones" className="flex-1">
                <div className="flex items-center justify-center gap-1.5">
                  <span>Zones</span>
                  {zones.length > 0 && (
                    <Chip size="sm" variant="soft">{zones.length}</Chip>
                  )}
                </div>
              </Tab>
            </TabList>

            <TabPanel id="users">
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-1">
                  {FILTERS.map(({ label, value }) => (
                    <Button
                      key={value}
                      onPress={() => setUserFilter(value)}
                      size="sm"
                      fullWidth
                      variant={userFilter === value ? 'primary' : 'secondary'}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-xs text-neutral-300 px-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideInactive}
                    onChange={(e) => setHideInactive(e.target.checked)}
                    className="accent-red-500"
                  />
                  Hide inactive
                </label>

                <ScrollShadow className="max-h-[calc(100vh-260px)] flex flex-col gap-1.5 pb-3">
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic px-1 pt-2">No users</p>
                  ) : (
                    <motion.div layout className="flex flex-col gap-1.5">
                      <AnimatePresence>
                        {filteredUsers.map((u) => (
                          <motion.div
                            key={u.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Card
                              variant="flat"
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                if (u.pings?.[0]) {
                                  mapRef.current?.panTo(u.pings[0].lat, u.pings[0].lon);
                                }
                              }}
                              className={`w-full border cursor-pointer hover:opacity-80 transition-opacity ${STATUS_CARD[u.status]}`}
                            >
                              <Card.Content className="px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm font-bold ${STATUS_COLOR[u.status]}`}>
                                    …{shortId(u.id)}
                                  </p>
                                  <span className={`text-xs font-bold ${STATUS_COLOR[u.status]}`}>
                                    {u.status}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                  {formatLastSeen(u.last_seen)}
                                  {u.pings?.[0] &&
                                    ` · ${u.pings[0].lat.toFixed(4)}, ${u.pings[0].lon.toFixed(4)}`}
                                  {u.pings?.[0]?.alt != null &&
                                    ` · ↕ ${Math.round(u.pings[0].alt)}m`}
                                </p>
                              </Card.Content>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </ScrollShadow>
              </div>
            </TabPanel>

            <TabPanel id="zones">
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex flex-col gap-2">
                  <Button
                    onPress={toggleDrawMode}
                    fullWidth
                    variant={drawMode ? 'danger' : 'primary'}
                  >
                    {drawMode ? 'Cancel Drawing' : '+ Draw Zone'}
                  </Button>

                  {drawMode && (
                    <>
                      <p className="text-xs text-neutral-400">
                        Click map to place exactly 4 points.
                      </p>
                      <Input
                        type="text"
                        variant="primary"
                        placeholder="Zone name (optional)"
                        value={zoneName}
                        onChange={(e) => setZoneName(e.target.value)}
                      />
                    </>
                  )}

                  {points.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-400">
                          {points.length} point{points.length !== 1 ? 's' : ''} placed
                        </span>
                        <div className="flex gap-1">
                          <Button
                            onPress={undoPoint}
                            size="sm"
                            variant="secondary"
                          >
                            Undo
                          </Button>
                          <Button
                            onPress={clearDraft}
                            size="sm"
                            variant="danger-soft"
                          >
                            Clear
                          </Button>
                        </div>
                      </div>

                      {points.length === 4 && (
                        <Button
                          onPress={submitZone}
                          isDisabled={submitting}
                          fullWidth
                          variant="primary"
                          className="font-bold"
                        >
                          {submitting ? 'Creating…' : 'Submit Zone'}
                        </Button>
                      )}
                    </div>
                  )}

                  {submitMsg && (
                    <Card
                      variant="flat"
                      className={submitMsg.ok ? 'bg-success-900/30' : 'bg-danger-900/30'}
                    >
                      <Card.Content className="px-2 py-1.5">
                        <p className={`text-xs ${submitMsg.ok ? 'text-success-300' : 'text-danger-300'}`}>
                          {submitMsg.text}
                        </p>
                      </Card.Content>
                    </Card>
                  )}
                </div>

                <Separator />

                <ScrollShadow className="max-h-[calc(100vh-320px)] flex flex-col gap-2">
                  {zones.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic">No active zones</p>
                  ) : (
                    <motion.div layout className="flex flex-col gap-2">
                      <AnimatePresence>
                        {zones.map((z) => (
                          <motion.div
                            key={z.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Card variant="flat" className="border border-white/10">
                              <Card.Content className="flex flex-row items-center justify-between px-3 py-2">
                                <div className="min-w-0 mr-2">
                                  <p className="text-sm font-bold text-white truncate">{z.name}</p>
                                  <p className="text-xs text-neutral-400 font-mono">…{z.id.slice(-8)}</p>
                                </div>
                                <Button
                                  onPress={() => handleDeleteZone(z.id)}
                                  size="sm"
                                  variant="danger-soft"
                                  className="flex-shrink-0 font-semibold"
                                >
                                  Delete
                                </Button>
                              </Card.Content>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </ScrollShadow>
              </div>
            </TabPanel>
          </Tabs>
        </div>
      </motion.aside>
    </div>
  );
}
