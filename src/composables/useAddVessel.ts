import { inject } from 'vue';
import { useQuasar } from 'quasar';
import { fetchVesselHistory } from '../api/vesselService';
import { vesselDataKey } from '../composables/useVesselData';


export interface AddVesselInput {
  name: string | null;
  mmsi: string;
  start_date: string;
  end_date: string;
  intervalSeconds: number;
}

export type AddVesselOutcome =
  | { status: 'added' }
  | { status: 'skipped' }
  | { status: 'error'; message: string };

export interface AddVesselOptions {
  // 'confirm' (default): chiede conferma con un dialog prima di sostituire un mmsi duplicato.
  // 'replace': sostituisce l'entry esistente senza chiedere conferma.
  onDuplicate?: 'confirm' | 'replace';
}

export function useAddVessel() {
  const $q = useQuasar();
  const { vessels, addVessel, removeVessel } = inject(vesselDataKey)!;


  function confirmReload(mmsi: string): Promise<boolean> {
    return new Promise((resolve) => {
      $q.dialog({
        title: 'Vessel già presente',
        message: `${mmsi} already existing. Do you want reload it?`,
        cancel: true,
        persistent: true,
      })
        .onOk(() => resolve(true))
        .onCancel(() => resolve(false));
    });
  }

  async function addVesselWithHistory(
    input: AddVesselInput,
    options: AddVesselOptions = {},
  ): Promise<AddVesselOutcome> {
    const { onDuplicate = 'confirm' } = options;
    const existing = vessels.value.find((v) => v.mmsi === input.mmsi);

    if (existing && onDuplicate === 'confirm') {
      const reload = await confirmReload(input.mmsi);
      if (!reload) return { status: 'skipped' };
    }

    try {
      const points = await fetchVesselHistory(input.mmsi, input.start_date, input.end_date, input.intervalSeconds);

      if (existing) removeVessel(existing.id);
      addVessel({
        vessel_name: input.name,
        mmsi: input.mmsi,
        start_date: input.start_date,
        end_date: input.end_date,
        intervalSeconds: input.intervalSeconds,
        points,
      });

      return { status: 'added' };
    } catch (err) {
      console.error(err);
      return { status: 'error', message: 'Errore nel recupero dei dati. Controlla MMSI e date.' };
    }
  }

  return { addVesselWithHistory };
}
