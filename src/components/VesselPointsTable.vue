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
      <q-tr v-if="isExpandedRow(tableProps.row)" :props="tableProps" no-hover>
        <q-td :colspan="tableProps.cols.length">
          <div class="row q-gutter-sm">
            <q-chip icon="speed" color="blue-grey-7" text-color="white" dense>
              SOG: {{ tableProps.row.sog ?? 'n/d' }} kn
            </q-chip>
            <q-chip icon="explore" color="blue-grey-7" text-color="white" dense>
              COG: {{ tableProps.row.cog ?? 'n/d' }}°
            </q-chip>
            <q-chip icon="navigation" color="blue-grey-7" text-color="white" dense>
              Heading: {{ tableProps.row.heading ?? 'n/d' }}°
            </q-chip>
          </div>
        </q-td>
      </q-tr>
    </template>
  </q-table>

  <MissingPointsPanel />
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import type { QTableProps, QTable } from 'quasar';
import { vesselDataKey } from '../composables/useVesselData';
import { activeRowKey } from '../composables/useActiveRow';
import { useMissingPoints } from '../composables/useMissingPoints';
import { useTableRows } from '../composables/useTableRows';
import { useRowSelection } from '../composables/useRowSelection';
import MissingPointsPanel from './MissingPointsPanel.vue';

const { activeVessel } = inject(vesselDataKey)!;
const { activeRow, setActiveRow, zoomToRow, scrollSeq } = inject(activeRowKey)!;
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

const { rows } = useTableRows(activeVessel);
const { isActiveRow, isExpandedRow, clickRow, onRowMouseOver, onRowMouseLeave } = useRowSelection({
  rows,
  tableRef,
  activeRow,
  setActiveRow,
  zoomToRow,
  scrollSeq,
});
</script>
