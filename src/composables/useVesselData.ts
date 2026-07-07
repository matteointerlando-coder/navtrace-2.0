import { ref, computed, type InjectionKey } from 'vue';
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

export function useVesselData() {
  const vessels = ref<VesselEntry[]>([]);
  const activeVesselId = ref<string | null>(null);

  const activeVessel = computed(
    () => vessels.value.find((v) => v.id === activeVesselId.value) ?? null,
  );
  const visibleVessels = computed(() => vessels.value.filter((v) => v.visible));

  function addVessel(data: Omit<VesselEntry, 'id' | 'line' | 'color' | 'visible'>) {
    const color = PALETTE[vessels.value.length % PALETTE.length] ?? PALETTE[0]!;
    vessels.value.push({
      ...data,
      id: crypto.randomUUID(),
      line: data.points.map((p) => new LatLng(p.y, p.x)),
      color,
      visible: true,
    });
  }

  function removeVessel(id: string) {
    if (activeVesselId.value === id) activeVesselId.value = null;
    vessels.value = vessels.value.filter((v) => v.id !== id);
  }

  function toggleVesselVisibility(id: string) {
    const vessel = vessels.value.find((v) => v.id === id);
    if (vessel) vessel.visible = !vessel.visible;
  }

  function setVisible(id: string, visible: boolean) {
    const vessel = vessels.value.find((v) => v.id === id);
    if (vessel) vessel.visible = visible;
  }

  function setAllVisible(visible: boolean) {
    vessels.value.forEach((v) => {
      v.visible = visible;
    });
  }

  function setActiveVessel(id: string | null) {
    activeVesselId.value = id;
  }

  function clearAll() {
    vessels.value = [];
    activeVesselId.value = null;
  }

  return {
    vessels,
    activeVesselId,
    activeVessel,
    visibleVessels,
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
