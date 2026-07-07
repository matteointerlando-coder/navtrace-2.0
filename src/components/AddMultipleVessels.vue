<template>
  <q-card style="min-width: 300px">
    <q-card-section>
      <div class="text-h6">Add Multiple Vessels</div>
      <div class="text-caption text-grey">FILE EXEMPLE:<br>
        Name, MMSI, Start(YYYY-MM-DD), End(YYYY-MM-DD)<br>
        Vessel Name, 123456789, 2000-01-25, 2000-01-25<br>
        Vessel Name2, 987654321, 2000-01-25, 2000-01-25<br><br>
        If no date has been entered, the default turnaround time is one year in the past starting from today</div>
    </q-card-section>

    <q-card-section>
      <q-file
        v-model="file"
        label=".CSV"
        accept=".csv"
        outlined
        clearable
      />

      <q-banner v-if="error" class="bg-negative text-white q-mt-md" style="white-space: pre-line">
        {{ error }}
      </q-banner>

      <div class="row q-gutter-sm justify-end q-mt-md">
        <q-btn flat label="Cancel" v-close-popup :disable="loading" />
        <q-btn
          color="primary"
          label="Add"
          no-caps
          :loading="loading"
          :disable="!file"
          @click="onSubmit"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue';
import { fetchVesselHistory } from '../api/vesselService';
import { vesselDataKey } from '../composables/useVesselData';

const emit = defineEmits<{ done: [] }>();
const { addVessel } = inject(vesselDataKey)!;

const file = ref<File | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

interface CsvRow {
  name: string;
  mmsi: string;
  start: string;
  end: string;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  //console.log('CSV lines:', lines);

  const headers = lines[0]!.split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));

    return row as unknown as CsvRow;
  });
}

async function onSubmit() {
  if (!file.value) return;
  loading.value = true;
  error.value = null;

  try {
    const text = await file.value.text();
    const rows = parseCsv(text);

    if (rows.length === 0) {
      error.value = 'Il file CSV è vuoto.';
      return;
    }

    const failures: string[] = [];

    for (const row of rows) {
        
      if ( !row.name || !row.mmsi || !row.start || !row.end) {
        failures.push(`Riga incompleta (mmsi: ${row.mmsi || '?'})`);
        continue;
      }

      try {
        const points = await fetchVesselHistory(row.mmsi, row.start, row.end);
        addVessel({
          vessel_name: row.name || null,
          mmsi: row.mmsi,
          start_date: row.start,
          end_date: row.end,
          points,
        });
      } catch (err) {
        console.error(err);
        failures.push(`${row.mmsi}: errore nel recupero dei dati`);
      }
    }

    if (failures.length > 0) {
      error.value = `Alcune righe non sono state importate:\n${failures.join('\n')}`;
    } else {
      emit('done');
    }
  } catch (err) {
    error.value = 'Errore nella lettura del file CSV.';
    console.error(err);
  } finally {
    loading.value = false;
  }
}
</script>
