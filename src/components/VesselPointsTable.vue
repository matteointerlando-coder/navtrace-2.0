<template>
  <q-table
    ref="tableRef"
    style="height: 400px"
    flat
    bordered
    title="Vessel Points"
    :rows="rows"
    :columns="columns"
    row-key="index"
    virtual-scroll
    v-model:pagination="pagination"
    :rows-per-page-options="[0]"
  >
    <template v-slot:body="tableProps">
      <q-tr
        :props="tableProps"
        :class="{ 'bg-warning': gapBoundaryTimestamps.has(tableProps.row.timestamp) }"
        :style="isActiveRow(tableProps.row) ? 'outline: 2px solid var(--q-primary); outline-offset: -2px;' : ''"
        @click="clickRow(tableProps.row)"
        @mouseover="onRowMouseOver(tableProps.row)"
        @mouseleave="onRowMouseLeave()"
      >
        <q-td v-for="col in tableProps.cols" :key="col.name" :props="tableProps">
          {{ col.value }}
        </q-td>
      </q-tr>
    </template>
  </q-table>

  <MissingPointsPanel />
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue';
import type { QTableProps, QTable } from 'quasar';
import { vesselDataKey } from '../composables/useVesselData';
import { vesselTableKey } from '../composables/useVesselTable';
import { useMissingPoints } from '../composables/useMissingPoints';
import MissingPointsPanel from './MissingPointsPanel.vue';

const { activeVessel } = inject(vesselDataKey)!;
const { activeRow, setActiveRow, zoomToRow, scrollSeq } = inject(vesselTableKey)!;
const { activeVesselGaps } = useMissingPoints();

const tableRef = ref<QTable | null>(null);

const gapBoundaryTimestamps = computed(() => {
  const set = new Set<string>();
  activeVesselGaps.value.forEach((gap) => {
    set.add(gap.from.t);
    set.add(gap.to.t);
  });
  return set;
});

const pagination = ref({ rowsPerPage: 0 });

const columns: QTableProps['columns'] = [
  { name: 'timestamp', label: 'Timestamp', field: 'timestamp', align: 'left' },
  { name: 'vessel', label: 'Vessel', field: 'vessel', align: 'left' },
  { name: 'lat', label: 'Lat', field: 'lat', align: 'left' },
  { name: 'lon', label: 'Lon', field: 'lon', align: 'left' },
];

const rows = computed(() => {
  const vessel = activeVessel.value;
  if (!vessel) return [];
  return vessel.points.map((p, i) => ({
    timestamp: p.t,
    lat: p.y,
    lon: p.x,
    // mapLon (da vessel.line) puo' differire da lon se la rotta attraversa
    // l'antimeridiano: serve per posizionare marker/flyTo, lon resta il dato
    // "vero" mostrato in tabella/popup.
    mapLon: vessel.line[i]!.lng,
    sog: p.s,
    cog: p.c,
    heading: p.h,
    vessel: vessel.vessel_name,
    vesselId: vessel.id,
  }));
});

const pinnedRow = ref<(typeof rows.value)[number] | null>(null);
const hoverRow = ref<(typeof rows.value)[number] | null>(null);

// activeRow è condiviso con la mappa: un click su un punto/linea in
// useVesselLayers chiama setActiveRow, quindi la riga corrispondente si
// evidenzia qui senza che tabella e mappa si conoscano direttamente.
function isActiveRow(row: (typeof rows.value)[number]): boolean {
  return activeRow.value?.vesselId === row.vesselId && activeRow.value?.timestamp === row.timestamp;
}
//let hoverTimeout: ReturnType<typeof setTimeout> | null = null;


  /*
function clearHoverTimeout() {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
}*/

function clickRow(row: (typeof rows.value)[number]) {
  //clearHoverTimeout();
  hoverRow.value = null;
  pinnedRow.value = row;
  zoomToRow(row);
}

function onRowMouseOver(row: (typeof rows.value)[number]) {
  if (hoverRow.value === row) return;

  //clearHoverTimeout();
  hoverRow.value = row;
  /*hoverTimeout = setTimeout(() => {
    if (pinnedRow.value && pinnedRow.value !== row) {
      pinnedRow.value = null;
    }
    setActiveRow(row);
  }, 200);*/
  setActiveRow(row);
}

function onRowMouseLeave() {
  //clearHoverTimeout();
  hoverRow.value = null;
  if (pinnedRow.value) return;
  setActiveRow(null);
}

// scatta solo quando il click parte dalla mappa (selectRowFromMap): porta
// direttamente la riga corrispondente nel viewport della virtual-scroll,
// senza scroll animato.
watch(scrollSeq, () => {
  if (!activeRow.value) return;
  const index = rows.value.findIndex(
    (row) => row.vesselId === activeRow.value!.vesselId && row.timestamp === activeRow.value!.timestamp,
  );
  if (index < 0) return;
  tableRef.value?.scrollTo(index, 'center');
});
</script>
