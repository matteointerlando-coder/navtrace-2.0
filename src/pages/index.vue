<template>
  <q-layout view="lHh Lpr lff">
    <q-header elevated >
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title> Navtrace App </q-toolbar-title> 
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleRightDrawer" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen"  show-if-above bordered>
      <q-list>
        <q-item-label header> Essential Links </q-item-label>

        <q-item clickable @click="showAddVessel = true">
          <q-item-section avatar><q-icon name="add" /></q-item-section>
          <q-item-section><q-item-label>Add Vessels</q-item-label></q-item-section>
        </q-item>

        <q-item clickable @click="showAddMultipleVessel = true">
          <q-item-section avatar><q-icon name="add" /></q-item-section>
          <q-item-section><q-item-label>Add Multiple Vessels</q-item-label></q-item-section>
        </q-item>
       
        <!--<SearchVessel v-model="mmsi" :loading="loading" @search="searchByMmsi" />-->

        <template v-if="vessels.length">
          <q-separator spaced />
          <q-item>
            <q-item-section>
              <q-item-label caption>Tracks</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle
                :model-value="allVisible"
                label="Show all"
                size="sm"
                @update:model-value="setAllVisible($event)"
              />
            </q-item-section>
          </q-item>

          <VesselCard
            v-for="vessel in vessels"
            :key="vessel.id"
            :vessel="vessel"
          />

          <q-item>
            <q-item-section>
              <q-btn flat color="negative" icon="delete_sweep" label="Clear all" no-caps @click="clearAll()" />
            </q-item-section>
          </q-item>
        </template>

      </q-list>
    </q-drawer>

    <q-drawer v-model="rightDrawerOpen" side="right" :width="500" show-if-above bordered>
      <q-list>
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
              @mouseover="onRowMouseOver(tableProps.row)"
              @mouseleave="onRowMouseLeave"
            >
              <q-td v-for="col in tableProps.cols" :key="col.name" :props="tableProps">
                {{ col.value }}
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-dialog v-model="showAddVessel">
      <AddVessel @done="showAddVessel = false" />
    </q-dialog>

    <q-dialog v-model="showAddMultipleVessel">
      <AddMultipleVessels @done="showAddMultipleVessel = false" />
    </q-dialog>

  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, provide } from 'vue';
import type { QTableProps } from 'quasar';
//import SearchVessel from '@/components/searchVessel.vue';
import AddVessel from '@/components/AddVessel.vue';
import AddMultipleVessels from '@/components/AddMultipleVessels.vue';
import VesselCard from '@/components/VesselCard.vue';
//import { useVesselSearch } from '@/composables/useVesselSearch';
import { useVesselData, vesselDataKey } from '@/composables/useVesselData';
import { useVesselTable, vesselTableKey } from '@/composables/useVesselTable';


const vesselData = useVesselData();
const vesselTable = useVesselTable();
provide(vesselDataKey, vesselData);
provide(vesselTableKey, vesselTable);

const { vessels, setAllVisible, clearAll, activeVessel } = vesselData;
const { setActiveRow } = vesselTable;

const leftDrawerOpen = ref(false);
const rightDrawerOpen = ref(false);
const showAddVessel = ref(false);
const showAddMultipleVessel = ref(false);
const pagination = ref({rowsPerPage: 0})
//const activeTableRow = ref<{ timestamp: string; vessel: string | null; lat: number; lon: number } | null>(null);


function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function toggleRightDrawer() {
  rightDrawerOpen.value = !rightDrawerOpen.value;
}

//const { mmsi, loading, searchByMmsi } = useVesselSearch();
const allVisible = computed(() => vessels.value.every((v) => v.visible));


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
    //heading: p.h,
  }));
});

function onRowMouseOver(row: (typeof rows.value)[number]) {
  setActiveRow(row);
}

function onRowMouseLeave() {
  setActiveRow(null);
}



</script>

