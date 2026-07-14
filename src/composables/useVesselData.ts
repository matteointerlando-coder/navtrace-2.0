import { ref, computed, type InjectionKey } from 'vue';
import { fetchVesselHistory, type ShortPositionUpdate } from '../api/vesselService';
import type { LatLng } from 'leaflet';
import { unwrapLongitudes, recenterLine } from '../utils/lineGeometry';
import { loadPersisted, persist } from './useVesselPersistence';

const PALETTE = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45',
  '#d44278', '#469990', '#ba95e4', '#9A6324',
];

export interface VesselEntry {
  id: string;
  vessel_name: string | null;
  mmsi: string;
  start_date: string;
  end_date: string;
  intervalSeconds: number;
  points: ShortPositionUpdate[];
  line: LatLng[];
  color: string;
  visible: boolean;
}

export function useVesselData() {
  const vessels = ref<VesselEntry[]>([]);
  const activeVesselId = ref<string | null>(null);
  const restoring = ref(false);
  const resampling = ref(false);

  const colorCounter = ref(0);

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
        intervalSeconds: v.intervalSeconds,
        color: v.color,
        visible: v.visible,
      })),
      activeVesselId: activeVesselId.value,
    });
  }

  function buildEntry(data: Omit<VesselEntry, 'line'>): VesselEntry {
    return {
      ...data,
      //line: data.points.map((p) => new LatLng(p.y, p.x)),
      line: recenterLine(unwrapLongitudes(data.points)),
    };
  }

  function addVessel(data: Omit<VesselEntry, 'id' | 'line' | 'color' | 'visible'>) {

    const color = PALETTE[colorCounter.value % PALETTE.length] ?? PALETTE[0]!;
    colorCounter.value += 1;
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

  function deactiveVessel(id: string) {
    const vessel = vessels.value.find((v) => v.id === id);
    if (!vessel?.visible && activeVesselId.value === id) {
      activeVesselId.value = null;
    }

  }

  function toggleVesselVisibility(id: string) {
    const vessel = vessels.value.find((v) => v.id === id);
    if (vessel) {
      vessel.visible = !vessel.visible;
    }
    deactiveVessel(id);
    save();
  }

  function setVisible(id: string, visible: boolean) {
    const vessel = vessels.value.find((v) => v.id === id);
    if (vessel) vessel.visible = visible;
    deactiveVessel(id);
    save();
  }

  function setAllVisible(visible: boolean) {
    vessels.value.forEach((v) => {
      v.visible = visible;
      deactiveVessel(v.id);
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
            const points = await fetchVesselHistory(v.mmsi, v.start_date, v.end_date, v.intervalSeconds);
            return buildEntry({ ...v, points });
          } catch (err) {
            console.error("Impossibile ripristinare il vessel ${v.mmsi}", err);
            return null;
          }
        }),
      );

      vessels.value = restored.filter((v): v is VesselEntry => v !== null);
      colorCounter.value = vessels.value.length;
      if (saved.activeVesselId && vessels.value.some((v) => v.id === saved.activeVesselId)) {
        activeVesselId.value = saved.activeVesselId;
      }
      save();
    } finally {
      restoring.value = false;
    }
  }


  async function resampleAll(intervalSeconds: number) {
    if (vessels.value.length === 0) return;

    resampling.value = true;
    try {
      await Promise.all(
        vessels.value.map(async (v) => {
          try {
            const points = await fetchVesselHistory(v.mmsi, v.start_date, v.end_date, intervalSeconds);
            v.points = points;
            //v.line = points.map((p) => new LatLng(p.y, p.x));
            v.line = recenterLine(unwrapLongitudes(points));
            v.intervalSeconds = intervalSeconds;
          } catch (err) {
            console.error("Impossibile ricampionare il vessel ${v.mmsi}", err);
          }
        }),
      );
      save();
    } finally {
      resampling.value = false;
    }
  }

  void restore();

  return {
    vessels,
    activeVesselId,
    activeVessel,
    visibleVessels,
    restoring,
    resampling,
    addVessel,
    removeVessel,
    toggleVesselVisibility,
    setVisible,
    setAllVisible,
    setActiveVessel,
    clearAll,
    resampleAll,
  };
}

export type VesselData = ReturnType<typeof useVesselData>;
export const vesselDataKey: InjectionKey<VesselData> = Symbol('vesselData');
