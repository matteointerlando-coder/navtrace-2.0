<template>
  <q-expansion-item
    group="vessels"
    :model-value="isOpen"
    @show="onShow"
    @hide="onHide"
    >
    <template v-slot:header>
      <q-item-section avatar>
        <q-icon name="circle" :style="{ color: vessel.color }" />
      </q-item-section>
      <q-item-section>{{ vessel.vessel_name ?? vessel.mmsi }}</q-item-section>
      <q-item-section side>
        <div class="row items-center no-wrap">
          <q-toggle
            :model-value="vessel.visible"
            size="sm"
            dense
            @update:model-value="toggleVesselVisibility(vessel.id)"
            @click.stop
          />
          <q-btn flat round dense icon="delete" size="sm" @click.stop="removeVessel(vessel.id)" />
        </div>
      </q-item-section>
    </template>

    <q-card flat bordered class="q-ma-sm">
      <q-card-section class="q-gutter-xs text-body2">
        <div><strong>MMSI:</strong> {{ vessel.mmsi }}</div>
        <div><strong>Name:</strong> {{ vessel.vessel_name }}</div>
        <div><strong>From:</strong> {{ vessel.start_date }}</div>
        <div><strong>To:</strong> {{ vessel.end_date }}</div>
        <div><strong>Points:</strong> {{ vessel.points.length }}</div>
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import type { VesselEntry } from '../composables/useVesselData';
import { vesselDataKey } from '../composables/useVesselData';

const props = defineProps<{ vessel: VesselEntry }>();
const { removeVessel, toggleVesselVisibility, setVisible, setActiveVessel, activeVessel } =
  inject(vesselDataKey)!;

const isOpen = computed(() => activeVessel.value?.id === props.vessel.id);

function onShow() {
  setActiveVessel(props.vessel.id);
  setVisible(props.vessel.id, true);
}

function onHide() {
  if (activeVessel.value?.id === props.vessel.id) {
    setActiveVessel(null);
  }
}
</script>
