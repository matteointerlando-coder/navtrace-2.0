import { defineStore } from 'pinia';
import type { ShortPositionUpdate } from '../api/vesselService';
import { LatLng } from 'leaflet';

const PALETTE = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45',
  '#fabed4', '#469990', '#dcbeff', '#9A6324',
];

export interface VesselEntry {
  id: string;
  vessel_name: string | null;
  mmsi: string;
  start_date: string;
  end_date: string;
  points: ShortPositionUpdate[];
  line: LatLng[];
  color: string;
  visible: boolean;
}

export const useVesselDataStore = defineStore('vesselData', {
  state: () => ({
    vessels: [] as VesselEntry[],
    activeVesselId: null as string | null,
  }),

  getters: {
    activeVessel: (state): VesselEntry | null =>
      state.vessels.find((v) => v.id === state.activeVesselId) ?? null,
    visibleVessels: (state): VesselEntry[] =>
      state.vessels.filter((v) => v.visible),
  },

  actions: {
    addVessel(data: Omit<VesselEntry, 'id' | 'line' | 'color' | 'visible'>) {
      const color = PALETTE[this.vessels.length % PALETTE.length] ?? PALETTE[0]!;
      const entry: VesselEntry = {
        ...data,
        id: crypto.randomUUID(),
        line: data.points.map((p) => new LatLng(p.y, p.x)),
        color,
        visible: true,
      };
      this.vessels.push(entry);
    },

    removeVessel(id: string) {
      if (this.activeVesselId === id) this.activeVesselId = null;
      this.vessels = this.vessels.filter((v) => v.id !== id);
    },

    toggleVesselVisibility(id: string) {
      const vessel = this.vessels.find((v) => v.id === id);
      if (vessel) vessel.visible = !vessel.visible;
    },

    setAllVisible(visible: boolean) {
      this.vessels.forEach((v) => { v.visible = visible; });
    },

    setActiveVessel(id: string | null) {
      this.activeVesselId = id;
    },

    clearAll() {
      this.vessels = [];
      this.activeVesselId = null;
    },
  },
});
