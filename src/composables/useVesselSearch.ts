import { ref } from 'vue';

export interface Vessel {
  mmsi: string;
  name?: string;
}

export function useVesselSearch() {
  const mmsi = ref('');
  const loading = ref(false);
  const vessel = ref<Vessel | null>(null);
  const error = ref<string | null>(null);

  //async function searchByMmsi() {
  function searchByMmsi() {
    if (!mmsi.value.trim()) return;
    loading.value = true;
    error.value = null;
    vessel.value = null;

    try {
      // TODO: sostituire con la chiamata API reale
      // const res = await fetch(`/api/vessels/${mmsi.value}`);
      // vessel.value = await res.json();
    } catch {
      error.value = 'Vessel not found';
    } finally {
      loading.value = false;
    }
  }

  return { mmsi, loading, vessel, error, searchByMmsi };
}
