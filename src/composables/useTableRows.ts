import { computed, type ComputedRef } from 'vue';
import type { VesselEntry } from './useVesselData';

export interface TableRow {
  timestamp: string;
  lat: number;
  lon: number;
  mapLon: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  vessel: string | null;
  vesselId: string;
}

// Deriva le righe della tabella dai punti del vessel attivo.
export function useTableRows(activeVessel: ComputedRef<VesselEntry | null>) {
  const rows = computed<TableRow[]>(() => {
    const vessel = activeVessel.value;
    if (!vessel) return [];
    return vessel.points.map((p, i) => ({
      timestamp: p.t,
      lat: p.y,
      lon: p.x,
      mapLon: vessel.line[i]!.lng,
      sog: p.s,
      cog: p.c,
      heading: p.h,
      vessel: vessel.vessel_name,
      vesselId: vessel.id,
    }));
  });

  return { rows };
}
