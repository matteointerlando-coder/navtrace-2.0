import { LatLng } from 'leaflet';
import type { ShortPositionUpdate } from '../api/vesselService';

export function unwrapLongitudes(points: ShortPositionUpdate[]): LatLng[] {
  const line: LatLng[] = [];
  let offset = 0;
  let prevLon: number | null = null;

  for (const p of points) {
    let lon = p.x + offset;
    if (prevLon !== null) {
      const diff = lon - prevLon;
      if (diff > 180) {
        offset -= 360;
        lon -= 360;
      } else if (diff < -180) {
        offset += 360;
        lon += 360;
      }
    }
    line.push(new LatLng(p.y, lon));
    prevLon = lon;
  }

  return line;
}

export function recenterLine(line: LatLng[]): LatLng[] {
  if (line.length === 0) return line;

  const lons = line.map((ll) => ll.lng);
  const center = (Math.min(...lons) + Math.max(...lons)) / 2;
  const shift = -360 * Math.round(center / 360);
  if (shift === 0) return line;

  return line.map((ll) => new LatLng(ll.lat, ll.lng + shift));
}
