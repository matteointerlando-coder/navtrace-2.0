import L from 'leaflet';
import { watch, type ComputedRef, type Ref } from 'vue';
import type { VesselEntry } from './useVesselData';
import type { ActiveRow } from './useActiveRow';
import { getSimplifyTolerance, simplifyIndices, nearestPointIndex } from '../utils/lineSimplify';
import { useVesselMarkers, POINT_RADIUS, POINT_RADIUS_ACTIVE, ENDPOINT_RADIUS } from './useVesselMarkers';

// Mostrare/nascondere un vessel diventa un solo addLayer/removeLayer sul
// gruppo, invece di aggiungere/rimuovere ogni singolo layer dalla mappa.
// Il gruppo resta in cache anche quando il vessel è nascosto.
interface VesselLayer {
  group: L.LayerGroup;
  line: L.Polyline;
  start: L.CircleMarker;
  end: L.CircleMarker;
  points: L.CircleMarker[];
  stopVisibilityWatch: () => void;
}

export interface VesselLayersOptions {
  getMap: () => L.Map | null;
  vessels: Ref<VesselEntry[]>;
  visibleVessels: ComputedRef<VesselEntry[]>;
  activeVesselId: Ref<string | null>;
  hidePointPopup: () => void;
  isPopupFor: (vesselId: string) => boolean;
  setActiveVessel: (id: string | null) => void;
  // Il click su un punto/linea passa da qui (invece che da una chiamata
  // diretta a showPointPopup): aggiorna activeRow (popup + evidenziazione
  // riga) e fa scattare lo scroll della tabella sulla riga corrispondente.
  selectRowFromMap: (row: ActiveRow) => void;
}


export function useVesselLayers(options: VesselLayersOptions) {
  const { getMap, vessels, visibleVessels, activeVesselId, hidePointPopup, isPopupFor, setActiveVessel, selectRowFromMap } = options;

  const vesselLayers = new Map<string, VesselLayer>();
  const { createPointMarkers, applyVesselStyle } = useVesselMarkers({ activeVesselId, selectRowFromMap, setActiveVessel });

  // Ricalcola, per una rotta già disegnata, il sottoinsieme di punti da mostrare
  // in base allo zoom corrente
  function refreshVesselPoints(vessel: VesselEntry, currentMap: L.Map) {
    const layer = vesselLayers.get(vessel.id);
    if (!layer) return;

    const tolerance = getSimplifyTolerance(currentMap);
    const indices = simplifyIndices(currentMap, vessel.line, tolerance);

    layer.line.setLatLngs(indices.map((i) => vessel.line[i]!)); //non ricrea la polyline, ne aggiorna solo i punti

    layer.points.forEach((m) => layer.group.removeLayer(m));
    const isActive = vessel.id === activeVesselId.value;
    const pointRadius = isActive ? POINT_RADIUS_ACTIVE : POINT_RADIUS;
    layer.points = createPointMarkers(vessel, indices, pointRadius, layer.group, currentMap);
  }

  // Costruisce da zero il LayerGroup di un vessel (polyline + start/end + punti),
  // senza aggiungerlo alla mappa
  function buildVesselLayer(vessel: VesselEntry, currentMap: L.Map): Omit<VesselLayer, 'stopVisibilityWatch'> | null {
    const group = L.layerGroup();
    const tolerance = getSimplifyTolerance(currentMap);
    const indices = simplifyIndices(currentMap, vessel.line, tolerance);

    const line = L.polyline(indices.map((i) => vessel.line[i]!), {
      color: vessel.color,
    }).addTo(group);

    line.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      const idx = nearestPointIndex(vessel.line, e.latlng, currentMap);
      const pt = vessel.points[idx];
      if (!pt) return;
      selectRowFromMap({
        timestamp: pt.t,
        vessel: vessel.vessel_name,
        vesselId: vessel.id,
        lat: pt.y,
        lon: pt.x,
        mapLon: vessel.line[idx]!.lng,
        sog: pt.s,
        cog: pt.c,
      });
      // flyTo su vessel.points (pt.y/pt.x) porterebbe la mappa alla longitudine
      // "reale" normalizzata, saltando su un'altra copia del mondo rispetto a
      // quella in cui l'utente sta guardando la rotta se questa attraversa
      // l'antimeridiano: si usa invece la longitudine "srotolata" di vessel.line.
      currentMap.flyTo(vessel.line[idx]!, currentMap.getMaxZoom() - 3, { animate: false });
      setActiveVessel(vessel.id);
    });

    const pts = vessel.line;
    if (pts.length === 0) {
      return null;
    }

    const endpointOpts = { color: vessel.color, weight: 2, fillOpacity: 1, radius: ENDPOINT_RADIUS };
    const start = L.circleMarker(pts[0]!, { ...endpointOpts, fillColor: '#22c55e' }).addTo(group);
    const end = L.circleMarker(pts[pts.length - 1]!, { ...endpointOpts, fillColor: '#ef4444' }).addTo(group);

    const points = createPointMarkers(vessel, indices, POINT_RADIUS, group, currentMap);

    return { group, line, start, end, points };
  }

  // Crea il layer di un vessel e gli associa un watcher dedicato sulla sua
  // visibilità: da qui in poi, mostrare/nascondere quel vessel non tocca più
  // gli altri vessel né richiede di riscandire l'intera lista.
  function registerVessel(vessel: VesselEntry, currentMap: L.Map) {
    const built = buildVesselLayer(vessel, currentMap);
    if (!built) return;

    const stopVisibilityWatch = watch(() => vessel.visible, (visible) => {
      const currentMap = getMap();
      if (!currentMap) return;
      if (visible) {
        built.group.addTo(currentMap);
        // il gruppo era nascosto: lo zoom potrebbe essere cambiato nel
        // frattempo, risincronizza la semplificazione dei punti
        refreshVesselPoints(vessel, currentMap);
      } else {
        currentMap.removeLayer(built.group);
        if (isPopupFor(vessel.id)) {
          hidePointPopup();
        }
      }
    });

    const layer: VesselLayer = { ...built, stopVisibilityWatch };
    applyVesselStyle(layer, vessel.id === activeVesselId.value);
    if (vessel.visible) {
      layer.group.addTo(currentMap);
    }
    vesselLayers.set(vessel.id, layer);
  }

  function unregisterVessel(id: string) {
    const layer = vesselLayers.get(id);
    if (!layer) return;
    layer.stopVisibilityWatch();
    layer.group.remove();
    vesselLayers.delete(id);
    if (isPopupFor(id)) {
      hidePointPopup();
    }
  }

  // Scatta solo quando un vessel viene aggiunto/rimosso dalla lista (non sulla
  // sua visibilità o sull'active id, che hanno i loro watcher dedicati).
  watch(
    () => vessels.value.map((v) => v.id),
    (currentIds) => {
      const currentMap = getMap();
      if (!currentMap) return;
      const idSet = new Set(currentIds);

      for (const id of [...vesselLayers.keys()]) {
        if (!idSet.has(id)) unregisterVessel(id);
      }

      for (const vessel of vessels.value) {
        if (!vesselLayers.has(vessel.id)) {
          registerVessel(vessel, currentMap);
        }
      }
    },
  );

  // Cambio active: aggiorna lo stile solo del vessel che perde e di quello che
  // acquisisce lo stato active, invece di riscandire tutti i vessel visibili.
  watch(() => activeVesselId.value, (id, previousId) => {
    if (previousId) {
      const prev = vesselLayers.get(previousId);
      if (prev) applyVesselStyle(prev, false);
    }
    if (id) {
      const next = vesselLayers.get(id);
      if (next) applyVesselStyle(next, true);
    }

    const currentMap = getMap();
    if (!id || !currentMap) return;
    const line = vesselLayers.get(id)?.line;
    if (line && line.getBounds().isValid()) {
      currentMap.fitBounds(line.getBounds(), { padding: [40, 40] });
    }
  });

  // Popolamento iniziale: da chiamare una volta creata la mappa.
  function registerAll(currentMap: L.Map) {
    for (const vessel of vessels.value) {
      if (!vesselLayers.has(vessel.id)) {
        registerVessel(vessel, currentMap);
      }
    }
  }

  // Da chiamare sull'evento 'zoomend' della mappa.
  function refreshOnZoom() {
    const currentMap = getMap();
    if (!currentMap) return;
    for (const vessel of visibleVessels.value) {
      refreshVesselPoints(vessel, currentMap);
    }
  }

  function destroy() {
    for (const layer of vesselLayers.values()) {
      layer.stopVisibilityWatch();
      layer.group.remove();
    }
    vesselLayers.clear();
  }

  return { registerAll, refreshOnZoom, destroy };
}
