<template>
  <q-page>
    <div id="map" style="width: 100%; height: calc(100vh - 80px)" />
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, inject } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { vesselDataKey, type VesselEntry } from '../../composables/useVesselData';
import {vesselTableKey} from '../../composables/useVesselTable';

let map: L.Map | null = null;
let marker: L.Marker | null = null;
let resizeObserver: ResizeObserver | null = null;
const polylines = new Map<string, L.Polyline>();
const routeMarkers = new Map<string, { start: L.CircleMarker; end: L.CircleMarker; points: L.CircleMarker[] }>();

const POINT_RADIUS = 2;
const POINT_RADIUS_ACTIVE = 3;
const POINT_RADIUS_HOVER_BONUS = 3;
const ENDPOINT_RADIUS = POINT_RADIUS * 3;
const ENDPOINT_RADIUS_ACTIVE = POINT_RADIUS_ACTIVE * 3;

// Tolleranza (in pixel schermo) della semplificazione Douglas-Peucker per ogni
// livello di zoom di distanza dal massimo: a zoom massimo tolleranza 0 (tutti i
// punti), a zoom minimo tolleranza più alta (pochi punti, linea più leggera).
const SIMPLIFY_TOLERANCE_PER_ZOOM_LEVEL = 0.3;
const { visibleVessels, activeVesselId } = inject(vesselDataKey)!;
const { activeRow, zoomRow, zoomSeq } = inject(vesselTableKey)!;

interface PointPopupInfo {
  timestamp: string;
  vessel: string | null;
  vesselId: string;
  lat: number;
  lon: number;
  sog: number | null;
  cog: number | null;
}

let popupVesselId: string | null = null;

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
      popupVesselId = null;
    }
  });
  marker = newMarker;
  popupVesselId = point.vesselId;
  return marker;
}

function hidePointPopup() {
  marker?.remove();
  marker = null;
  popupVesselId = null;
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


// più siamo lontani dallo zoom massimo, più punti vengono scartati
function getSimplifyTolerance(currentMap: L.Map): number {
  const levelsFromMax = Math.max(0, currentMap.getMaxZoom() - currentMap.getZoom());  //se sono a zoom massimo allora la tollerance sarà 0
  return levelsFromMax * SIMPLIFY_TOLERANCE_PER_ZOOM_LEVEL;
}

// Douglas-Peucker (L.LineUtil.simplify) applicato in coordinate schermo, così la
// tolleranza in pixel resta coerente indipendentemente dallo zoom/proiezione.
// Ritorna gli indici (nell'array originale) dei punti da tenere, estremi inclusi.
function simplifyIndices(currentMap: L.Map, latlngs: L.LatLng[], tolerancePx: number): number[] {
  //caso banale. 3 punti o tollerance = 0 non semplifico e ritorno gli indici
  if (latlngs.length < 3 || tolerancePx === 0) {
    return latlngs.map((_, i) => i);
  }
  const projected = latlngs.map((ll, idx) => {
    //converte ogni coordinata GPS (lat/lon) nel punto pixel corrispondente sullo schermo, alla vista corrente
    const p = currentMap.latLngToLayerPoint(ll) as L.Point & { idx: number };
    p.idx = idx;  //idx è l'indice del punto nell'array originale
    return p;
  });
  // semplifica l'array di punti utilizzando l'algoritmo Douglas-Peucker. 
  const simplified = L.LineUtil.simplify(projected, tolerancePx) as Array<L.Point & { idx: number }>;
  return simplified.map((p) => p.idx);
}

function createPointMarkers(
  vessel: VesselEntry,
  indices: number[],
  pointRadius: number,
  currentMap: L.Map,
): L.CircleMarker[] {
  return indices.map((i) => {
    const pt = vessel.line[i]!;
    const point = vessel.points[i]!;
    const m = L.circleMarker(pt, {
      radius: pointRadius,
      color: vessel.color,
      weight: 2,
      fillOpacity: 1,
    }).addTo(currentMap);

    m.bindTooltip(point.t, { direction: 'top', offset: [0, -pointRadius], opacity: 0.85 });

    // ingrandisce il pallino al passaggio del mouse e lo riporta in primo piano,
    // per facilitare il click su punti ravvicinati lungo la rotta
    m.on('mouseover', () => {
      const base = vessel.id === activeVesselId.value ? POINT_RADIUS_ACTIVE : POINT_RADIUS;
      m.setStyle({ radius: base + POINT_RADIUS_HOVER_BONUS }).bringToFront();
    });
    m.on('mouseout', () => {
      const base = vessel.id === activeVesselId.value ? POINT_RADIUS_ACTIVE : POINT_RADIUS;
      m.setStyle({ radius: base });
    });

    m.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      showPointPopup({
        timestamp: point.t,
        vessel: vessel.vessel_name,
        vesselId: vessel.id,
        lat: pt.lat,
        lon: pt.lng,
        sog: point.s,
        cog: point.c,
      }, currentMap);
    });

    return m;
  });
}

// Ricalcola, per una rotta già disegnata, il sottoinsieme di punti da mostrare
// in base allo zoom corrente: aggiorna la polyline e ricrea i marker-punto
// (start/end restano fissi, sono sempre inclusi dalla semplificazione).
function refreshVesselPoints(vessel: VesselEntry, currentMap: L.Map) {
  const line = polylines.get(vessel.id);
  const markers = routeMarkers.get(vessel.id);
  if (!line || !markers) return;

  const tolerance = getSimplifyTolerance(currentMap);
  const indices = simplifyIndices(currentMap, vessel.line, tolerance);

  line.setLatLngs(indices.map((i) => vessel.line[i]!)); //non ricrea la polyline, ne aggiorna solo i punti

  markers.points.forEach((m) => m.remove());
  const isActive = vessel.id === activeVesselId.value;
  const pointRadius = isActive ? POINT_RADIUS_ACTIVE : POINT_RADIUS;
  markers.points = createPointMarkers(vessel, indices, pointRadius, currentMap);
}

//disegno mappa 
onMounted(() => {
  const mapEl = document.getElementById('map')!;

  map = L.map(mapEl, {
    maxBounds: [[-110, -270], [110, 270]],
    maxBoundsViscosity: 1.0,
    renderer: L.canvas(),
    // renderer: L.svg(),
  }).setView([20.505, -0.09], 0);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 9,
    minZoom: 2,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  //Leaflet non si accorge automaticamente se il contenitore (#map) cambia dimensione.
  //Leaflet continua a renderizzare i tile per la vecchia dimensione più piccola, lasciando l'area "grigetta" nella zona liberata dal drawer.
  //ResizeObserver sul contenitore della mappa che chiama map.invalidateSize() ogni volta che le dimensioni cambiano
  resizeObserver = new ResizeObserver(() => map?.invalidateSize());
  resizeObserver.observe(mapEl);

  // ad ogni cambio di zoom, ricalcola il dettaglio (RDP) di tutte le rotte visibili
  map.on('zoomend', () => {
    if (!map) return;
    const currentMap = map;
    for (const vessel of visibleVessels.value) {
      refreshVesselPoints(vessel, currentMap);
    }
  });
});

watch(
  () => ({
    visible: visibleVessels.value.map((v) => v.id),
    activeId: activeVesselId.value,
    
  }),
  () => {
    if (!map) return;
    const currentMap = map;

    const visibleIds = new Set(visibleVessels.value.map((v) => v.id));

    console.log('Visible vessels:', visibleIds);

    // rimuovi polyline e marker di vessel non più visibili
    for (const [id, line] of polylines) {
      if (!visibleIds.has(id)) {
        line.remove();
        polylines.delete(id);
        const markers = routeMarkers.get(id);
        if (markers) {
          markers.start.remove();
          markers.end.remove();
          markers.points.forEach((m) => m.remove());
        }
        routeMarkers.delete(id);
        if (popupVesselId === id) {
          hidePointPopup();
        }
      }
    }

    // aggiungi o aggiorna polyline di vessel visibili
    for (const vessel of visibleVessels.value) {
      const isActive = vessel.id === activeVesselId.value;
      const weight = isActive ? 4 : 2;
      const opacity = isActive ? 1 : 0.5;
      const pointRadius = isActive ? POINT_RADIUS_ACTIVE : POINT_RADIUS;
      const endpointRadius = isActive ? ENDPOINT_RADIUS_ACTIVE : ENDPOINT_RADIUS;

      if (polylines.has(vessel.id)) {
        polylines.get(vessel.id)!.setStyle({ weight, opacity });
        const markers = routeMarkers.get(vessel.id);
        if (markers) {
          markers.start.setStyle({ radius: endpointRadius, opacity });
          markers.end.setStyle({ radius: endpointRadius, opacity });
          markers.points.forEach((m) => m.setStyle({ radius: pointRadius, opacity }));
        }
      } else {
        const tolerance = getSimplifyTolerance(currentMap);
        const indices = simplifyIndices(currentMap, vessel.line, tolerance);

        const line = L.polyline(indices.map((i) => vessel.line[i]!), {
          color: vessel.color,
          weight,
          opacity,
        }).addTo(currentMap);
        polylines.set(vessel.id, line);

        line.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          const idx = nearestPointIndex(vessel.line, e.latlng);
          const pt = vessel.points[idx];
          if (!pt) return;
          showPointPopup({
            timestamp: pt.t,
            vessel: vessel.vessel_name,
            vesselId: vessel.id,
            lat: pt.y,
            lon: pt.x,
            sog: pt.s,
            cog: pt.c,
          }, currentMap);
          currentMap.flyTo([pt.y, pt.x], currentMap.getMaxZoom());
        });

        const pts = vessel.line;   //perchè non computed?  Se lo usassi dentro una callback di watch, creeresti un nuovo computed ref ad ogni esecuzione del watch — che non viene mai pulito (memory leak) e non serve a niente.
        if (pts.length > 0) {
          const endpointOpts = { radius: endpointRadius, color: vessel.color, weight: 2, fillOpacity: 1 };
          const start = L.circleMarker(pts[0]!, { ...endpointOpts, fillColor: '#22c55e' }).addTo(currentMap);
          const end = L.circleMarker(pts[pts.length - 1]!, { ...endpointOpts, fillColor: '#ef4444' }).addTo(currentMap);

          const points = createPointMarkers(vessel, indices, pointRadius, currentMap);

          routeMarkers.set(vessel.id, { start, end, points });
        }
      }
    }
  },
  { deep: true },
);

watch(() => activeRow.value, (row) => {
  if (!map) return;
  if (row) {
    showPointPopup(row, map);
  } else {
    hidePointPopup();
  }
});

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
