<template>
  <q-table
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
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import type { QTableProps } from 'quasar';
import { vesselDataKey } from '../composables/useVesselData';
import { vesselTableKey } from '../composables/useVesselTable';

const { activeVessel } = inject(vesselDataKey)!;
const { setActiveRow, zoomToRow } = inject(vesselTableKey)!;

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
  return vessel.points.map((p) => ({
    timestamp: p.t,
    lat: p.y,
    lon: p.x,
    sog: p.s,
    cog: p.c,
    heading: p.h,
    vessel: vessel.vessel_name,
    vesselId: vessel.id,
  }));
});

const pinnedRow = ref<(typeof rows.value)[number] | null>(null);
const hoverRow = ref<(typeof rows.value)[number] | null>(null);
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
</script>
