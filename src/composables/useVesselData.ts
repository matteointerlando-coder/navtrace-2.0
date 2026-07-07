import { ref, computed, type InjectionKey } from 'vue';
import { fetchVesselHistory, type ShortPositionUpdate } from '../api/vesselService';
import { LatLng } from 'leaflet';

const PALETTE = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45',
  '#fabed4', '#469990', '#dcbeff', '#9A6324',
];

const STORAGE_KEY = 'vesselData';

// Solo i metadati vengono persistiti: points/line vengono ri-scaricati al
// restore per evitare di saturare il localStorage con tracce lunghe.
interface PersistedVessel {
  id: string;
  vessel_name: string | null;
  mmsi: string;
  start_date: string;
  end_date: string;
  color: string;
  visible: boolean;
}

interface PersistedState {
  vessels: PersistedVessel[];
  activeVesselId: string | null;
}

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : { vessels: [], activeVesselId: null };
  } catch {
    return { vessels: [], activeVesselId: null };
  }
}

function persist(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

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

export function useVesselData() {
  const vessels = ref<VesselEntry[]>([]);
  const activeVesselId = ref<string | null>(null);
  const restoring = ref(false);


  const activeVessel = computed(
    () => vessels.value.find((v) => v.id === activeVesselId.value) ?? null,
  );
  const visibleVessels = computed(() => vessels.value.filter((v) => v.visible));

  function save() {
    persist({
      vessels: vessels.value.map((v) => ({
        id: v.id,
        vessel_name: v.vessel_name,
        mmsi: v.mmsi,
        start_date: v.start_date,
        end_date: v.end_date,
        color: v.color,
        visible: v.visible,
      })),
      activeVesselId: activeVesselId.value,
    });
  }

  function buildEntry(data: Omit<VesselEntry, 'line'>): VesselEntry {
    return {
      ...data,
      line: data.points.map((p) => new LatLng(p.y, p.x)),
    };
  }

  function addVessel(data: Omit<VesselEntry, 'id' | 'line' | 'color' | 'visible'>) {

    const color = PALETTE[vessels.value.length % PALETTE.length] ?? PALETTE[0]!;
    vessels.value.push(buildEntry({
      ...data,
      id: crypto.randomUUID(),
      color,
      visible: true,
    }));
    save();
  }

  function removeVessel(id: string) {
    if (activeVesselId.value === id) activeVesselId.value = null;
    vessels.value = vessels.value.filter((v) => v.id !== id);
    save();
  }

  function toggleVesselVisibility(id: string) {
    const vessel = vessels.value.find((v) => v.id === id);
    if (vessel) vessel.visible = !vessel.visible;
    save();
  }

  function setVisible(id: string, visible: boolean) {
    const vessel = vessels.value.find((v) => v.id === id);
    if (vessel) vessel.visible = visible;
    save();
  }

  function setAllVisible(visible: boolean) {
    vessels.value.forEach((v) => {
      v.visible = visible;
    });
    save();
  }

  function setActiveVessel(id: string | null) {
    activeVesselId.value = id;
    save();
  }

  function clearAll() {
    vessels.value = [];
    activeVesselId.value = null;
    save();
  }

  async function restore() {
    const saved = loadPersisted();
    if (saved.vessels.length === 0) return;

    restoring.value = true;
    try {
      const restored = await Promise.all(
        saved.vessels.map(async (v): Promise<VesselEntry | null> => {
          try {
            const points = await fetchVesselHistory(v.mmsi, v.start_date, v.end_date);
            return buildEntry({ ...v, points });
          } catch (err) {
            console.error(`Impossibile ripristinare il vessel ${v.mmsi}`, err);
            return null;
          }
        }),
      );

      vessels.value = restored.filter((v): v is VesselEntry => v !== null);
      if (saved.activeVesselId && vessels.value.some((v) => v.id === saved.activeVesselId)) {
        activeVesselId.value = saved.activeVesselId;
      }
      save();
    } finally {
      restoring.value = false;
    }
  }

  void restore();

  return {
    vessels,
    activeVesselId,
    activeVessel,
    visibleVessels,
    restoring,
    addVessel,
    removeVessel,
    toggleVesselVisibility,
    setVisible,
    setAllVisible,
    setActiveVessel,
    clearAll,
  };
}

export type VesselData = ReturnType<typeof useVesselData>;
export const vesselDataKey: InjectionKey<VesselData> = Symbol('vesselData');
