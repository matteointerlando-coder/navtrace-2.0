<template>
  <q-page class="q-pa-md">
    <div class="text-h6 q-mb-md">Add Vessel</div>

    <q-form @submit.prevent="onSubmit" class="column q-gutter-md" style="max-width: 400px">
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

      <q-btn type="submit" color="primary" label="Add" no-caps />
    </q-form>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const mmsi = ref('');
const name = ref('');

function onSubmit() {
  // TODO: chiamata API per aggiungere il vessel
  console.log({ mmsi: mmsi.value, name: name.value });
}
</script>
