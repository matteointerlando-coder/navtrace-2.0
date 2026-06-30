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
const polylines = new Map<string, L.Polyline>();
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

watch(
  () => ({
    visible: vesselDataStore.visibleVessels.map((v) => v.id),
    activeId: vesselDataStore.activeVesselId,
    vessels: vesselDataStore.vessels,
  }),
  () => {
    if (!map) return;

    const visibleIds = new Set(vesselDataStore.visibleVessels.map((v) => v.id));

    // rimuovi polyline di vessel non più visibili
    for (const [id, line] of polylines) {
      if (!visibleIds.has(id)) {
        line.remove();
        polylines.delete(id);
      }
    }

    // aggiungi o aggiorna polyline di vessel visibili
    for (const vessel of vesselDataStore.visibleVessels) {
      const isActive = vessel.id === vesselDataStore.activeVesselId;
      const weight = isActive ? 4 : 2;
      const opacity = isActive ? 1 : 0.5;

      if (polylines.has(vessel.id)) {
        polylines.get(vessel.id)!.setStyle({ weight, opacity });
      } else {
        const line = L.polyline(vessel.line, {
          color: vessel.color,
          weight,
          opacity,
        }).addTo(map);
        polylines.set(vessel.id, line);
      }
    }
  },
  { deep: true },
);

watch(() => vesselDataStore.activeVesselId, (id) => {
  if (!id || !map) return;
  const line = polylines.get(id);
  if (line && line.getBounds().isValid()) {
    map.fitBounds(line.getBounds(), { padding: [40, 40] });
  }
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
  polylines.clear();
});
</script>
