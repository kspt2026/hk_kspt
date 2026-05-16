import React, { useMemo } from 'react'
import { Modal, View, Pressable, Text, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { Zone } from '../types'

interface UserLocation {
  lat: number
  lon: number
}

interface Props {
  visible: boolean
  zones: Zone[]
  onClose: () => void
  userLocation?: UserLocation | null
}

function buildHtml(zones: Zone[], userLocation?: UserLocation | null): string {
  const polygons = zones
    .map((z) => z.polygon.coordinates[0].map(([lon, lat]) => [lat, lon]))
    .filter((ring) => ring.length >= 3)

  const userLocJson = userLocation ? JSON.stringify(userLocation) : 'null'

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #0a0a0f; }
  #map { width: 100vw; height: 100vh; background: #0a0a0f; }
  .leaflet-container { background: #0a0a0f; outline: none; }
  .leaflet-control-attribution { background: rgba(10,10,15,0.7) !important; color: #666 !important; font-size: 9px; }
  .leaflet-control-attribution a { color: #888 !important; }
  .leaflet-control-zoom a { background: #13131a !important; color: #fff !important; border-color: rgba(255,255,255,0.10) !important; }
  .leaflet-control-zoom a:hover { background: #1a1a22 !important; }
  .user-label { background: transparent !important; border: none !important; box-shadow: none !important; color: #fff; font-size: 11px; font-weight: 600; white-space: nowrap; }
  .user-label::before { display: none !important; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([44.4268, 26.1025], 12);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
    pane: 'shadowPane',
    opacity: 0.8
  }).addTo(map);

  var polygons = ${JSON.stringify(polygons)};
  var group = L.featureGroup();
  polygons.forEach(function (ring) {
    L.polygon(ring, {
      color: '#ef4444',
      weight: 2,
      opacity: 0.9,
      fillColor: '#dc2626',
      fillOpacity: 0.30
    }).addTo(group);
  });
  group.addTo(map);

  var userLoc = ${userLocJson};
  if (userLoc) {
    L.circleMarker([userLoc.lat, userLoc.lon], {
      radius: 9,
      color: '#ffffff',
      weight: 2.5,
      fillColor: '#3b82f6',
      fillOpacity: 1,
    }).addTo(map).bindTooltip('You', {
      permanent: true,
      direction: 'right',
      offset: [10, 0],
      className: 'user-label',
    });
  }

  var bounds = polygons.length ? group.getBounds() : null;
  if (userLoc) {
    var pt = L.latLng(userLoc.lat, userLoc.lon);
    bounds = bounds ? bounds.extend(pt) : L.latLngBounds([pt, pt]);
  }
  if (bounds && bounds.isValid()) {
    try { map.fitBounds(bounds.pad(0.25)); } catch (e) {}
  }
</script>
</body>
</html>`
}

export function MapOverlay({ visible, zones, onClose, userLocation }: Props) {
  const html = useMemo(() => buildHtml(zones, userLocation), [zones, userLocation])

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      transparent
      statusBarTranslucent
    >
      <Animated.View
        entering={SlideInUp.duration(280)}
        exiting={SlideOutUp.duration(220)}
        style={StyleSheet.absoluteFill}
      >
        <View className="flex-1 bg-bg">
          <View className="absolute top-12 left-0 right-0 z-50 flex-row items-center justify-between px-4">
            <View className="px-3 py-2 rounded-full bg-bg/80 border border-border">
              <Text className="text-white text-sm font-semibold">
                {zones.length} active {zones.length === 1 ? 'zone' : 'zones'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Close map"
              className="w-12 h-12 rounded-full bg-bg/80 border border-border items-center justify-center active:bg-surface"
            >
              <MaterialCommunityIcons name="close" size={22} color="#fff" />
            </Pressable>
          </View>

          <WebView
            originWhitelist={['*']}
            source={{ html }}
            style={{ flex: 1, backgroundColor: '#0a0a0f' }}
            javaScriptEnabled
            domStorageEnabled
            scalesPageToFit={false}
            allowsInlineMediaPlayback
            mixedContentMode="always"
            setSupportMultipleWindows={false}
            androidLayerType="hardware"
          />
        </View>
      </Animated.View>
    </Modal>
  )
}
