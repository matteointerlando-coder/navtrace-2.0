import { defineStore } from 'pinia';

const STORAGE_KEY = 'addVesselForm';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const addVesselFormStore = defineStore('addVesselForm', {
  state: () => {
    const saved = loadFromStorage();
    return {
      vessel_name: (saved.vessel_name ?? null) as string | null,
      mmsi: (saved.mmsi ?? null) as string | null,
      start_date: (saved.start_date ?? null) as string | null,
      end_date: (saved.end_date ?? null) as string | null,
    };
  },

  actions: {
    update(vessel_name?: string, mmsi?: string, start_date?: string, end_date?: string) {
      this.vessel_name = vessel_name ?? null;
      this.mmsi = mmsi ?? null;
      this.start_date = start_date ?? null;
      this.end_date = end_date ?? null;

      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        vessel_name: this.vessel_name,
        mmsi: this.mmsi,
        start_date: this.start_date,
        end_date: this.end_date,
      }));
    },

  },
});
