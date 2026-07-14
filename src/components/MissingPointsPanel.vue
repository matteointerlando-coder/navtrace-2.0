<template>
  <template v-if="activeVesselGaps.length">
    <q-banner dense class="bg-warning text-dark q-mt-sm">
      <template v-slot:avatar><q-icon name="warning" /></template>
      {{ activeVesselGaps.length }} interruzion{{ activeVesselGaps.length === 1 ? 'e' : 'i' }} rilevat{{ activeVesselGaps.length === 1 ? 'a' : 'e' }} nella rotta
    </q-banner>
    <q-list bordered separator>
      <q-item
        v-for="(gap, i) in activeVesselGaps"
        :key="i"
        clickable
        @click="zoomToGap(gap)"
      >
        <q-item-section avatar>
          <q-icon name="warning" color="warning" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ gap.from.t }} → {{ gap.to.t }}</q-item-label>
          <q-item-label caption>{{ formatGapDuration(gap.hours) }} senza dati</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </template>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { vesselDataKey } from '../composables/useVesselData';
import { vesselTableKey } from '../composables/useVesselTable';
import { useMissingPoints, type PointGap } from '../composables/useMissingPoints';

const { activeVessel } = inject(vesselDataKey)!;
const { zoomToRow } = inject(vesselTableKey)!;
const { activeVesselGaps } = useMissingPoints();

function formatGapDuration(hours: number): string {
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (days === 0) return `${remainingHours}h`;
  return `${days}g ${remainingHours}h`;
}

function zoomToGap(gap: PointGap) {
  const vessel = activeVessel.value;
  if (!vessel) return;
  // gap.from è lo stesso oggetto (stessa reference) di un elemento di
  // vessel.points, quindi indexOf trova l'indice corrispondente in
  // vessel.line per recuperare la longitudine "srotolata".
  const index = vessel.points.indexOf(gap.from);
  const mapLon = index >= 0 ? vessel.line[index]!.lng : gap.from.x;
  zoomToRow({
    timestamp: gap.from.t,
    vessel: vessel.vessel_name,
    vesselId: vessel.id,
    lat: gap.from.y,
    lon: gap.from.x,
    mapLon,
    sog: gap.from.s,
    cog: gap.from.c,
  });
}
</script>
