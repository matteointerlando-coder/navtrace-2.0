<template>
    <div class="q-px-lg q-pt-md q-pb-xl">
    <q-item-label caption class="q-mb-sm">
      Resample interval (seconds){{ resampling ? ' — loading...' : '' }}
    </q-item-label>
    <q-slider
      class="q-mt-xl"
      v-model="stepIndex"
      color="deep-orange"
      label-always
      :label-value="String(STEPS[stepIndex])"
      :disable="resampling"
      markers
      :marker-labels="markerLabel"
      :min="0"
      :max="STEPS.length - 1"
      :step="1"
    >
    <template v-slot:marker-label-group="scope">
    <div
        v-for="marker in scope.markerList"
        :key="marker.index"
        :class="[
        `text-deep-orange-${2 + Math.ceil(marker.value / 2)}`,
        marker.classes
        ]"
        :style="markerStyle(marker)"
        @click="stepIndex = marker.value"
        >{{ marker.label }}</div
    >
    </template>
    </q-slider>
    </div>
</template>


<script setup lang="ts">
import { ref, watch, inject, type CSSProperties } from 'vue'
import type { SliderMarkerLabelConfig } from 'quasar'
import { vesselDataKey } from '../composables/useVesselData'

const { vessels, resampling, resampleAll } = inject(vesselDataKey)!


function markerStyle(marker: SliderMarkerLabelConfig): CSSProperties {
  return marker.style as CSSProperties
}

const STEPS = [1, 2, 4, 8, 16, 32, 64, 120, 250]

function markerLabel(index: number): string {
  return String(STEPS[index])
}

const stepIndex = ref(STEPS.indexOf(120))

let debounceHandle: ReturnType<typeof setTimeout> | null = null
watch(stepIndex, (index) => {
  if (debounceHandle) clearTimeout(debounceHandle)
  debounceHandle = setTimeout(() => {
    if (vessels.value.length === 0) return
    void resampleAll(STEPS[index]!)
  }, 400)
})
</script>
