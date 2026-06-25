<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> Navtrace App </q-toolbar-title>

      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Essential Links </q-item-label>

        <q-item clickable @click="showAddVessel = true">
          <q-item-section avatar>
            <q-icon name="add" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Add Vessel</q-item-label>
          </q-item-section>
        </q-item>

        <EssentialLink v-for="link in linksList" :key="link.label" v-bind="link" />
        <SearchVessel v-model="mmsi" :loading="loading" @search="searchByMmsi" />

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
import { ref } from 'vue';
import EssentialLink, { type EssentialLinkProps } from '@/components/EssentialLink.vue';
import SearchVessel from '@/components/searchVessel.vue';
import AddVessel from '@/components/AddVessel.vue';
import { useVesselSearch } from '@/composables/useVesselSearch';

const linksList: EssentialLinkProps[] = [
  {
    label: 'Add Multiple Vessels',
    icon: 'add',
    to: '/',
  },
];

const leftDrawerOpen = ref(false);
const showAddVessel = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

const { mmsi, loading, searchByMmsi } = useVesselSearch();
</script>
