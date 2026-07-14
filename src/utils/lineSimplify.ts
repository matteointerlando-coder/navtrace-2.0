import L from 'leaflet';

// Tolleranza (in pixel schermo) della semplificazione Douglas-Peucker per ogni
// livello di zoom di distanza dal massimo: a zoom massimo tolleranza 0 (tutti i
// punti), a zoom minimo tolleranza più alta (pochi punti, linea più leggera).
const SIMPLIFY_TOLERANCE_PER_ZOOM_LEVEL = 0.3;

export function nearestPointIndex(points: L.LatLng[], latlng: L.LatLng, currentMap: L.Map): number {
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
export function getSimplifyTolerance(currentMap: L.Map): number {
  const levelsFromMax = Math.max(0, currentMap.getMaxZoom() - currentMap.getZoom());
  return levelsFromMax * SIMPLIFY_TOLERANCE_PER_ZOOM_LEVEL;
}

// Douglas-Peucker (L.LineUtil.simplify) applicato in coordinate schermo.
// Ritorna gli indici (nell'array originale) dei punti da tenere, estremi inclusi.
export function simplifyIndices(currentMap: L.Map, latlngs: L.LatLng[], tolerancePx: number): number[] {
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
