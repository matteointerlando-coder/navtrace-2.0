import L from 'leaflet';
import type { Ref } from 'vue';
import type { VesselEntry } from './useVesselData';
import type { ActiveRow } from './useActiveRow';

export const POINT_RADIUS = 2;
export const POINT_RADIUS_ACTIVE = 3;
const POINT_RADIUS_HOVER_BONUS = 3;
export const ENDPOINT_RADIUS = POINT_RADIUS * 3;
export const ENDPOINT_RADIUS_ACTIVE = POINT_RADIUS_ACTIVE * 3;

interface StyleableVesselLayer {
  line: L.Polyline;
  start: L.CircleMarker;
  end: L.CircleMarker;
  points: L.CircleMarker[];
}

export interface VesselMarkersOptions {
  activeVesselId: Ref<string | null>;
  // Il click su un punto passa da qui (invece che da una chiamata diretta a
  // showPointPopup): aggiorna activeRow (popup + evidenziazione riga) e fa
  // scattare lo scroll della tabella sulla riga corrispondente.
  selectRowFromMap: (row: ActiveRow) => void;
  setActiveVessel: (id: string | null) => void;
}

// Crea i marker dei singoli punti di una rotta e applica lo stile
// active/inactive a un layer già costruito (linea + estremi + punti).
export function useVesselMarkers(options: VesselMarkersOptions) {
  const { activeVesselId, selectRowFromMap, setActiveVessel } = options;

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
        selectRowFromMap({
          timestamp: point.t,
          vessel: vessel.vessel_name,
          vesselId: vessel.id,
          // pt.lat/pt.lng vengono da vessel.line, che può avere longitudini
          // "srotolate" oltre ±180 quando la rotta attraversa l'antimeridiano:
          // per il popup/tabella serve invece il dato grezzo normalizzato.
          lat: point.y,
          lon: point.x,
          mapLon: pt.lng,
          sog: point.s,
          cog: point.c,
        });
        currentMap.flyTo([pt.lat, pt.lng], currentMap.getMaxZoom() - 3, { animate: false });
        //al click il vessel diventa automaticamente active, il watcher su activeVesselId si occupa di aggiornare lo stile della rotta
        setActiveVessel(vessel.id);
      });

      return m;
    });
  }

  function applyVesselStyle(layer: StyleableVesselLayer, isActive: boolean) {
    const weight = isActive ? 4 : 2;
    const opacity = isActive ? 1 : 0.5;
    const pointRadius = isActive ? POINT_RADIUS_ACTIVE : POINT_RADIUS;
    const endpointRadius = isActive ? ENDPOINT_RADIUS_ACTIVE : ENDPOINT_RADIUS;

    layer.line.setStyle({ weight, opacity });
    layer.start.setStyle({ radius: endpointRadius, opacity });
    layer.end.setStyle({ radius: endpointRadius, opacity });
    layer.points.forEach((m) => m.setStyle({ radius: pointRadius, opacity }));
  }

  return { createPointMarkers, applyVesselStyle };
}
