<template>
  <q-card style="min-width: 400px">
    <q-card-section>
      <div class="text-h6">Add Vessel</div>
    </q-card-section>

    <q-card-section>
      <q-form @submit.prevent="onSubmit" class="column q-gutter-md">
        
        <q-input
        outlined
        v-model="name"
        label="Vessel name"
        />

        <q-input
          outlined
          v-model="mmsi"
          label="MMSI"
          :rules="[val => !!val || 'MMSI is required']"
        />

        <q-input filled v-model="start_date">
          <template v-slot:prepend>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="start_date" mask="YYYY-MM-DD HH:mm">
                  <div class="row items-center justify-end">
                    <q-btn v-close-popup label="Close" color="primary" flat />
                  </div>
                </q-date>
              </q-popup-proxy>
            </q-icon>
          </template>

          <template v-slot:append>
            <q-icon name="access_time" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-time v-model="start_date" mask="YYYY-MM-DD HH:mm" format24h>
                  <div class="row items-center justify-end">
                    <q-btn v-close-popup label="Close" color="primary" flat />
                  </div>
                </q-time>
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>

        <q-input filled v-model="end_date" :error="!!dateError" :error-message="dateError">
          <template v-slot:prepend>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="end_date" mask="YYYY-MM-DD HH:mm">
                  <div class="row items-center justify-end">
                    <q-btn v-close-popup label="Close" color="primary" flat />
                  </div>
                </q-date>
              </q-popup-proxy>
            </q-icon>
          </template>

          <template v-slot:append>
            <q-icon name="access_time" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-time v-model="end_date" mask="YYYY-MM-DD HH:mm" format24h>
                  <div class="row items-center justify-end">
                    <q-btn v-close-popup label="Close" color="primary" flat />
                  </div>
                </q-time>
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
        <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>

        <div class="row q-gutter-sm justify-end">
          <q-btn flat label="Cancel" v-close-popup :disable="loading" />
          <q-btn type="submit" color="primary" label="Add" no-caps :loading="loading" />
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import { fetchVesselHistory } from '../api/vesselService';
import { useAddVesselForm } from '../composables/useAddVesselForm';
import { vesselDataKey } from '../composables/useVesselData';

const emit = defineEmits<{ done: [] }>();

const { vessel_name: name, mmsi, start_date, end_date } = useAddVesselForm();
const { addVessel } = inject(vesselDataKey)!;

const loading = ref(false);
const error = ref<string | null>(null);

const dateError = computed(() => {
  if (start_date.value && end_date.value && start_date.value >= end_date.value) {
    return 'End date must be after start date';
  }
  return '';
});

async function onSubmit() {
  if (dateError.value) return;
  loading.value = true;
  error.value = null;

  try {
    const points = await fetchVesselHistory(mmsi.value, start_date.value, end_date.value);
    addVessel({
      vessel_name: name.value || null,
      mmsi: mmsi.value,
      start_date: start_date.value,
      end_date: end_date.value,
      points,
    });
    emit('done');
  } catch (err) {
    error.value = 'Errore nel recupero dei dati. Controlla MMSI e date.';
    console.error(err);
  } finally {
    loading.value = false;
  }
}
</script>