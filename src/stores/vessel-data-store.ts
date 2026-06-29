import { defineStore } from 'pinia';
import type { ShortPositionUpdate } from '../api/vesselService';
import { LatLng } from 'leaflet';

export interface VesselEntry {
  id: string;
  vessel_name: string | null;
  mmsi: string;
  start_date: string;
  end_date: string;
  points: ShortPositionUpdate[];
  line: LatLng[];
}

export const useVesselDataStore = defineStore('vesselData', {
  state: () => ({
    vessels: [] as VesselEntry[],
    activeVesselId: null as string | null,
  }),

  getters: {
    activeVessel: (state): VesselEntry | null =>
      state.vessels.find((v) => v.id === state.activeVesselId) ?? null,
  },

  actions: {
    addVessel(data: Omit<VesselEntry, 'id' | 'line'>) {
      const entry: VesselEntry = {
        ...data,
        id: crypto.randomUUID(),
        line: data.points.map((p) => new LatLng(p.y, p.x)),
      };
      this.vessels.push(entry);
    },

    removeVessel(id: string) {
      if (this.activeVesselId === id) this.activeVesselId = null;
      this.vessels = this.vessels.filter((v) => v.id !== id);
    },

    setActiveVessel(id: string | null) {
      this.activeVesselId = id;
    },
  },
});
