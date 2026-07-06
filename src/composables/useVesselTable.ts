import { ref, type InjectionKey } from 'vue';


export interface ActiveRow {
  timestamp: string;
  vessel: string | null;
  lat: number;
  lon: number;
};


export function useVesselTable() {
  const activeRow = ref<ActiveRow | null>(null);

  function setActiveRow(row: ActiveRow | null) {
    activeRow.value = row;
  }

  return {
    activeRow,
    setActiveRow,
  };
}

export const vesselTableKey: InjectionKey<ReturnType<typeof useVesselTable>> = Symbol('vesselTable');