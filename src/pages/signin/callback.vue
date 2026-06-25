<template>
  <div class="callback-page">
    <q-spinner-oval color="primary" size="4em" />
    <p class="text-grey-6 q-mt-md">Autenticazione in corso...</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// Il boot keycloak.ts ha già scambiato il code per i token prima che questa
// pagina venga renderizzata. Reindirizza alla home (il guard permetterà il passaggio).
onMounted(() => {
  void router.replace('/');
});
</script>

<style scoped>
.callback-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
