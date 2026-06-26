import { defineStore } from 'pinia';
import type { ShortPositionUpdate } from '../api/vesselService';

export const useVesselDataStore = defineStore('vesselData', {
  state: () => ({
    points: [] as ShortPositionUpdate[],
  }),

  actions: {
    setPoints(points: ShortPositionUpdate[]) {
      this.points = points;
    },
  },
});
