<template>
  <q-item clickable :to="to">
    <q-item-section v-if="icon" avatar>
      <q-icon :name="icon" />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ label }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
export interface EssentialLinkProps {
  label: string;
  to?: string;
  icon?: string;
}

withDefaults(defineProps<EssentialLinkProps>(), {
  label: '',
  to: '/',
  icon: '',
});
</script>
