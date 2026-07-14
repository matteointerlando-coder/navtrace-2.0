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
import { activeRowKey } from '../../composables/useActiveRow';
import { usePointPopup } from '../../composables/usePointPopup';
import { useVesselLayers } from '../../composables/useVesselLayers';

let map: L.Map | null = null;
let resizeObserver: ResizeObserver | null = null;

const { vessels, visibleVessels, activeVesselId, setActiveVessel } = inject(vesselDataKey)!;
const { activeRow, zoomRow, zoomSeq, selectRowFromMap } = inject(activeRowKey)!;

const { showPointPopup, hidePointPopup, isPopupFor } = usePointPopup();

const vesselLayers = useVesselLayers({
  getMap: () => map,
  vessels,
  visibleVessels,
  activeVesselId,
  hidePointPopup,
  isPopupFor,
  setActiveVessel,
  selectRowFromMap,
});

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
    maxZoom: 12,
    minZoom: 2,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  //Leaflet non si accorge automaticamente se il contenitore (#map) cambia dimensione.
  //Leaflet continua a renderizzare i tile per la vecchia dimensione più piccola, lasciando l'area "grigetta" nella zona liberata dal drawer.
  //ResizeObserver sul contenitore della mappa che chiama map.invalidateSize() ogni volta che le dimensioni cambiano
  resizeObserver = new ResizeObserver(() => map?.invalidateSize());
  resizeObserver.observe(mapEl);

  // ad ogni cambio di zoom, ricalcola il dettaglio di tutte le rotte visibili
  map.on('zoomend', () => vesselLayers.refreshOnZoom());

  // vessel già presenti al mount (es. ripristinati da localStorage prima che
  // il componente montasse): add/remove successivi sono gestiti dal watcher
  // interno di useVesselLayers.
  vesselLayers.registerAll(map);
});

watch(() => activeRow.value, (row) => {
  if (!map) return;
  if (row) {
    showPointPopup(row, map);
  } else {
    hidePointPopup();
  }
});

watch(() => zoomSeq.value, () => {
  if (!map || !zoomRow.value) return;
  //map.flyTo([zoomRow.value.lat, zoomRow.value.lon], map.getMaxZoom() - 3);
  map.flyTo([zoomRow.value.lat, zoomRow.value.mapLon], map.getMaxZoom() - 3, { animate: false });
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  vesselLayers.destroy();
  map?.remove();
  map = null;
});
</script>
