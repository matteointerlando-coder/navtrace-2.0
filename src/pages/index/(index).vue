<template>
  <q-page>
    <div id="map" style="width: 100%; height: calc(100vh - 80px)" />
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let map: L.Map | null = null;

onMounted(() => {
  map = L.map('map', {
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0,
  }).setView([20.505, -0.09], 3);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 7,
    minZoom: 3,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});
</script>
