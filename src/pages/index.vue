<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated >
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title> Navtrace App </q-toolbar-title>
        
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Essential Links </q-item-label>

        <q-item clickable @click="showAddVessel = true">
          <q-item-section avatar><q-icon name="add" /></q-item-section>
          <q-item-section><q-item-label>Add Vessels</q-item-label></q-item-section>
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

    

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-dialog v-model="showAddVessel">
      <AddVessel @done="showAddVessel = false" />
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, provide } from 'vue';

//import SearchVessel from '@/components/searchVessel.vue';
import AddVessel from '@/components/AddVessel.vue';
import VesselCard from '@/components/VesselCard.vue';
//import { useVesselSearch } from '@/composables/useVesselSearch';
import { useVesselData, vesselDataKey } from '@/composables/useVesselData';

const vesselData = useVesselData();
provide(vesselDataKey, vesselData);


const { vessels, setAllVisible, clearAll } = vesselData;

const leftDrawerOpen = ref(false);



const showAddVessel = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}



//const { mmsi, loading, searchByMmsi } = useVesselSearch();

const allVisible = computed(() => vessels.value.every((v) => v.visible));
</script>
