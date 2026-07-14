import L from 'leaflet';
import { watch, type ComputedRef, type Ref } from 'vue';
import type { VesselEntry } from './useVesselData';
import type { ActiveRow } from './useVesselTable';

const POINT_RADIUS = 2;
const POINT_RADIUS_ACTIVE = 3;
const POINT_RADIUS_HOVER_BONUS = 3;
const ENDPOINT_RADIUS = POINT_RADIUS * 3;
const ENDPOINT_RADIUS_ACTIVE = POINT_RADIUS_ACTIVE * 3;

// Tolleranza (in pixel schermo) della semplificazione Douglas-Peucker per ogni
// livello di zoom di distanza dal massimo: a zoom massimo tolleranza 0 (tutti i
// punti), a zoom minimo tolleranza più alta (pochi punti, linea più leggera).
const SIMPLIFY_TOLERANCE_PER_ZOOM_LEVEL = 0.3;


// Mostrare/nascondere un vessel diventa un solo addLayer/removeLayer sul
// gruppo, invece di aggiungere/rimuovere ogni singolo layer dalla mappa.
// Il gruppo resta in cache anche quando il vessel è nascosto, così un
// toggle di visibilità non richiede di ricalcolare semplificazione e marker.
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
  showPointPopup: (point: ActiveRow, map: L.Map | null) => L.Marker | null;
  hidePointPopup: () => void;
  isPopupFor: (vesselId: string) => boolean;
}


export function useVesselLayers(options: VesselLayersOptions) {
  const { getMap, vessels, visibleVessels, activeVesselId, showPointPopup, hidePointPopup, isPopupFor } = options;

  const vesselLayers = new Map<string, VesselLayer>();

  function nearestPointIndex(points: L.LatLng[], latlng: L.LatLng, currentMap: L.Map): number {
    let nearestIndex = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = currentMap.distance(p, latlng);
      if (dist < minDist) {
        minDist = dist;
        nearestIndex = i;
      }
    });
    return nearestIndex;
  }

  // più siamo lontani dallo zoom massimo, più punti vengono scartati
  function getSimplifyTolerance(currentMap: L.Map): number {
    const levelsFromMax = Math.max(0, currentMap.getMaxZoom() - currentMap.getZoom());
    return levelsFromMax * SIMPLIFY_TOLERANCE_PER_ZOOM_LEVEL;
  }

  // Douglas-Peucker (L.LineUtil.simplify) applicato in coordinate schermo.
  // Ritorna gli indici (nell'array originale) dei punti da tenere, estremi inclusi.
  function simplifyIndices(currentMap: L.Map, latlngs: L.LatLng[], tolerancePx: number): number[] {
    if (latlngs.length < 3 || tolerancePx === 0) {
      return latlngs.map((_, i) => i);
    }
    const projected = latlngs.map((ll, idx) => {
      const p = currentMap.latLngToLayerPoint(ll) as L.Point & { idx: number };
      p.idx = idx;
      return p;
    });
    const simplified = L.LineUtil.simplify(projected, tolerancePx) as Array<L.Point & { idx: number }>;
    return simplified.map((p) => p.idx);
  }

  function createPointMarkers(
    vessel: VesselEntry,
    indices: number[],
    pointRadius: number,
    group: L.LayerGroup,
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
      }).addTo(group);

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
        currentMap.flyTo([pt.lat, pt.lng], currentMap.getMaxZoom() - 3);
      });

      return m;
    });
  }

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


  function applyVesselStyle(layer: VesselLayer, isActive: boolean) {
    const weight = isActive ? 4 : 2;
    const opacity = isActive ? 1 : 0.5;
    const pointRadius = isActive ? POINT_RADIUS_ACTIVE : POINT_RADIUS;
    const endpointRadius = isActive ? ENDPOINT_RADIUS_ACTIVE : ENDPOINT_RADIUS;

    layer.line.setStyle({ weight, opacity });
    layer.start.setStyle({ radius: endpointRadius, opacity });
    layer.end.setStyle({ radius: endpointRadius, opacity });
    layer.points.forEach((m) => m.setStyle({ radius: pointRadius, opacity }));
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
      showPointPopup({
        timestamp: pt.t,
        vessel: vessel.vessel_name,
        vesselId: vessel.id,
        lat: pt.y,
        lon: pt.x,
        sog: pt.s,
        cog: pt.c,
      }, currentMap);
      currentMap.flyTo([pt.y, pt.x], currentMap.getMaxZoom() - 3);
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
