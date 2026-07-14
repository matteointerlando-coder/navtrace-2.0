const STORAGE_KEY = 'vesselData';

// Solo i metadati vengono persistiti: points/line vengono ri-scaricati al
// restore per evitare di saturare il localStorage con tracce lunghe.
export interface PersistedVessel {
  id: string;
  vessel_name: string | null;
  mmsi: string;
  start_date: string;
  end_date: string;
  intervalSeconds: number;
  color: string;
  visible: boolean;
}

export interface PersistedState {
  vessels: PersistedVessel[];
  activeVesselId: string | null;
}

export function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : { vessels: [], activeVesselId: null };
  } catch {
    return { vessels: [], activeVesselId: null };
  }
}

export function persist(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
