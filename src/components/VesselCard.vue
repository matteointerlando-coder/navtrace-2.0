<template>
  <q-expansion-item
    group="vessels"
    @show="store.setActiveVessel(vessel.id)"
    @hide="store.setActiveVessel(null)"
  >
    <template v-slot:header>
      <q-item-section>{{ vessel.vessel_name ?? vessel.mmsi }}</q-item-section>
      <q-item-section side>
        <q-btn flat round dense icon="delete" size="sm" @click.stop="store.removeVessel(vessel.id)" />
      </q-item-section>
    </template>

    <q-card flat bordered class="q-ma-sm">
      <q-card-section class="q-gutter-xs text-body2">
        <div><strong>MMSI:</strong> {{ vessel.mmsi }}</div>
        <div><strong>Nome:</strong> {{ vessel.vessel_name }}</div>
        <div><strong>Da:</strong> {{ vessel.start_date }}</div>
        <div><strong>A:</strong> {{ vessel.end_date }}</div>
        <div><strong>Punti:</strong> {{ vessel.points.length }}</div>
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>

<script setup lang="ts">
import type { VesselEntry } from '../stores/vessel-data-store';
import { useVesselDataStore } from '../stores/vessel-data-store';

defineProps<{ vessel: VesselEntry }>();
const store = useVesselDataStore();
</script>
