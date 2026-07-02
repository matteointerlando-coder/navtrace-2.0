import { ref, computed } from 'vue';

const STORAGE_KEY = 'addVesselForm';

function load(): Record<string, string | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string | null>) : {};
  } catch {
    return {};
  }
}

function persist(state: Record<string, string | null>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Singleton: creati una volta sola al primo import
const saved = load();
const _name = ref<string | null>(saved['vessel_name'] ?? null);
const _mmsi = ref<string | null>(saved['mmsi'] ?? null);
const _start_date = ref<string | null>(saved['start_date'] ?? null);
const _end_date = ref<string | null>(saved['end_date'] ?? null);

function save() {
  persist({
    vessel_name: _name.value,
    mmsi: _mmsi.value,
    start_date: _start_date.value,
    end_date: _end_date.value,
  });
}

export function useAddVesselForm() {
  const vessel_name = computed({
    get: () => _name.value ?? '',
    set: (v: string) => { _name.value = v || null; save(); },
  });

  const mmsi = computed({
    get: () => _mmsi.value ?? '',
    set: (v: string) => { _mmsi.value = v || null; save(); },
  });

  const start_date = computed({
    get: () => _start_date.value ?? '',
    set: (v: string) => { _start_date.value = v || null; save(); },
  });

  const end_date = computed({
    get: () => _end_date.value ?? '',
    set: (v: string) => { _end_date.value = v || null; save(); },
  });

  return { vessel_name, mmsi, start_date, end_date };
}
