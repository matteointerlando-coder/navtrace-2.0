<template>
  <q-card style="min-width: 400px">
    <q-card-section>
      <div class="text-h6">Add Vessel</div>
    </q-card-section>

    <q-card-section>
      <q-form @submit.prevent="onSubmit" class="column q-gutter-md">
        <q-input
          outlined
          v-model="mmsi"
          label="MMSI"
          :rules="[val => !!val || 'MMSI is required']"
        />
        <q-input
          outlined
          v-model="name"
          label="Vessel name"
        />
        <div class="row q-gutter-sm justify-end">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn type="submit" color="primary" label="Add" no-caps />
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{ done: [] }>();

const mmsi = ref('');
const name = ref('');

function onSubmit() {
  console.log({ mmsi: mmsi.value, name: name.value });
  emit('done');
}
</script>
