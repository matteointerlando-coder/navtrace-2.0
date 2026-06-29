<template>
  <q-page>
    <div id="map" style="width: 100%; height: calc(100vh - 80px)" />
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useVesselDataStore } from '../../stores/vessel-data-store';

let map: L.Map | null = null;
//let currentMarker: L.Marker | null = null;
let currentLine: L.Polyline | null = null;
const vesselDataStore = useVesselDataStore();

onMounted(() => {
  map = L.map('map', {
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0,
  }).setView([20.505, -0.09], 0);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 7,
    minZoom: 3,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
});


/*
watch(() => vesselDataStore.points, (points) => {
  if (!map || points.length === 0) return;
  const first = points[0];
  console.log("first point: ", first);
  if (!first) return;
  currentMarker?.remove();
  currentMarker = L.marker([first.y, first.x]).addTo(map);
  map.setView([first.y, first.x], 6);
});
 */

watch(() => vesselDataStore.activeVessel?.line ?? [], (line) => {
  currentLine?.remove();
  currentLine = null;
  if (!map || line.length === 0) return;
  currentLine = L.polyline(line, { color: 'red' }).addTo(map);
});
 
onBeforeUnmount(() => {
  map?.remove();
  map = null;
});
</script>
