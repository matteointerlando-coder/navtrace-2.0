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
       


        <q-item v-if="restoring">
          <q-item-section avatar><q-spinner color="primary" /></q-item-section>
          <q-item-section><q-item-label caption>Ripristino tracce...</q-item-label></q-item-section>
        </q-item>

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
        <VesselPointsTable />
        <q-separator spaced />
        <PointSlider />
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
//import SearchVessel from '@/components/searchVessel.vue';
import AddVessel from '@/components/AddVessel.vue';
import AddMultipleVessels from '@/components/AddMultipleVessels.vue';
import VesselCard from '@/components/VesselCard.vue';
import VesselPointsTable from '@/components/VesselPointsTable.vue';
import PointSlider from '@/components/PointSlider.vue';
//import { useVesselSearch } from '@/composables/useVesselSearch';
import { useVesselData, vesselDataKey } from '@/composables/useVesselData';
import { useActiveRow, activeRowKey } from '@/composables/useActiveRow';



const vesselData = useVesselData();
const activeRow = useActiveRow();

provide(vesselDataKey, vesselData);
provide(activeRowKey, activeRow);


const { vessels, restoring, setAllVisible, clearAll } = vesselData;

const leftDrawerOpen = ref(false);
const rightDrawerOpen = ref(false);
const showAddVessel = ref(false);
const showAddMultipleVessel = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function toggleRightDrawer() {
  rightDrawerOpen.value = !rightDrawerOpen.value;
}

//const { mmsi, loading, searchByMmsi } = useVesselSearch();
const allVisible = computed(() => vessels.value.every((v) => v.visible));


</script>

