<template>
  <q-page>
    <div id="map" style="width: 100%; height: calc(100vh - 80px)" />
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, inject } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { vesselDataKey } from '../../composables/useVesselData';
import {vesselTableKey} from '../../composables/useVesselTable';

let map: L.Map | null = null;
let marker: L.Marker | null = null;
let resizeObserver: ResizeObserver | null = null;
const polylines = new Map<string, L.Polyline>();
const routeMarkers = new Map<string, L.CircleMarker[]>();
const { vessels, visibleVessels, activeVesselId } = inject(vesselDataKey)!;
const { activeRow, zoomRow, zoomSeq } = inject(vesselTableKey)!;

interface PointPopupInfo {
  timestamp: string;
  vessel: string | null;
  lat: number;
  lon: number;
  sog: number | null;
  cog: number | null;
}

function showPointPopup(point: PointPopupInfo, map: L.Map | null) {
  if (!map) return null;
  marker?.remove();
  const newMarker = L.marker([point.lat, point.lon]).addTo(map);
  newMarker.bindPopup(`Name Vessel: ${point.vessel} <br>
  Timestamp: ${point.timestamp}<br>
  Lat: ${point.lat.toFixed(4)}<br>
  Lon: ${point.lon.toFixed(4)}<br>
  SOG: ${point.sog ?? 'n/d'} kn<br>
  COG: ${point.cog ?? 'n/d'}°`).openPopup();

  newMarker.on('popupclose', () => {
    if (marker === newMarker) {
      newMarker.remove();
      marker = null;
    }
  });
  marker = newMarker;
  return marker;
}

function hidePointPopup() {
  marker?.remove();
  marker = null;
}

function nearestPointIndex(points: L.LatLng[], latlng: L.LatLng): number {
  let nearestIndex = 0;
  let minDist = Infinity;
  points.forEach((p, i) => {
    const dist = map!.distance(p, latlng);
    if (dist < minDist) {
      minDist = dist;
      nearestIndex = i;
    }
  });
  return nearestIndex;
}



//disegno mappa 
onMounted(() => {
  const mapEl = document.getElementById('map')!;

  map = L.map(mapEl, {
    maxBounds: [[-110, -270], [110, 270]],
    maxBoundsViscosity: 1.0,
  }).setView([20.505, -0.09], 0);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 7,
    minZoom: 2,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  //Leaflet non si accorge automaticamente se il contenitore (#map) cambia dimensione.
  //Leaflet continua a renderizzare i tile per la vecchia dimensione più piccola, lasciando l'area "grigetta" nella zona liberata dal drawer.
  //ResizeObserver sul contenitore della mappa che chiama map.invalidateSize() ogni volta che le dimensioni cambiano
  resizeObserver = new ResizeObserver(() => map?.invalidateSize());
  resizeObserver.observe(mapEl);
});

watch(
  () => ({
    visible: visibleVessels.value.map((v) => v.id),
    activeId: activeVesselId.value,
    vessels: vessels.value,
    activeRow: activeRow.value,
  }),
  () => {
    if (!map) return;

    const visibleIds = new Set(visibleVessels.value.map((v) => v.id));

    // rimuovi polyline e marker di vessel non più visibili
    for (const [id, line] of polylines) {
      if (!visibleIds.has(id)) {
        line.remove();
        polylines.delete(id);
        routeMarkers.get(id)?.forEach((m) => m.remove());
        routeMarkers.delete(id);
      }
    }

    // aggiungi o aggiorna polyline di vessel visibili
    for (const vessel of visibleVessels.value) {
      const isActive = vessel.id === activeVesselId.value;
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

        line.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          const idx = nearestPointIndex(vessel.line, e.latlng);
          const pt = vessel.points[idx];
          if (!pt) return;
          showPointPopup({
            timestamp: pt.t,
            vessel: vessel.vessel_name,
            lat: pt.y,
            lon: pt.x,
            sog: pt.s,
            cog: pt.c,
          }, map);
          map!.flyTo([pt.y, pt.x], map!.getMaxZoom());
        });

        const pts = vessel.line;   //perchè non computed?  Se lo usassi dentro una callback di watch, creeresti un nuovo computed ref ad ogni esecuzione del watch — che non viene mai pulito (memory leak) e non serve a niente.
        if (pts.length > 0) {
          const markerOpts = { radius: 6, color: vessel.color, weight: 2, fillOpacity: 1 };
          const start = L.circleMarker(pts[0]!, { ...markerOpts, fillColor: '#22c55e' }).addTo(map);
          const end = L.circleMarker(pts[pts.length - 1]!, { ...markerOpts, fillColor: '#ef4444' }).addTo(map);
          routeMarkers.set(vessel.id, [start, end]);
        }
      }
    }

    
    if (activeRow.value) {
      showPointPopup(activeRow.value, map);
    } else {
      hidePointPopup();
    }
  },
  { deep: true },
);

watch(() => activeVesselId.value, (id) => {
  if (!id || !map) return;
  const line = polylines.get(id);
  if (line && line.getBounds().isValid()) {
    map.fitBounds(line.getBounds(), { padding: [40, 40] });
  }
});

watch(() => zoomSeq.value, () => {
  if (!map || !zoomRow.value) return;
  map.flyTo([zoomRow.value.lat, zoomRow.value.lon], map.getMaxZoom());
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  map?.remove();
  map = null;
  marker = null;
  polylines.clear();
  routeMarkers.clear();
});
</script>
