<template>
  <div class="q-pa-md">
    <q-input
      outlined
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event as string)"
      placeholder="Search vessel by MMSI"
      :loading="loading"
      @keyup.enter="$emit('search')"
    >
      <template #append>
        <q-btn flat round dense icon="search" @click="$emit('search')" />
      </template>
    </q-input>
  </div>
</template>

<script setup lang="ts">
defineProps<{
    modelValue: string;
    loading?: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: string];
  search: [];
}>();
</script>
