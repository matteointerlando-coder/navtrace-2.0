import L from 'leaflet';
import type { ActiveRow } from './useActiveRow';

// Gestisce il marker/popup del singolo punto selezionato sulla mappa
export function usePointPopup() {
  let marker: L.Marker | null = null;
  let popupVesselId: string | null = null;

  function showPointPopup(point: ActiveRow, map: L.Map | null) {
    if (!map) return null;
    marker?.remove();

    const newMarker = L.marker([point.lat, point.mapLon]).addTo(map);
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

  function isPopupFor(vesselId: string) {
    return popupVesselId === vesselId;
  }

  return { showPointPopup, hidePointPopup, isPopupFor };
}
