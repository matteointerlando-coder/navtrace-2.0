import { defineStore, acceptHMRUpdate } from 'pinia';
import type { KeycloakTokenParsed } from 'keycloak-js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    token: null as string | null,
    username: null as string | null,
    roles: [] as string[],
  }),

  getters: {
    hasRole:
      (state) =>
      (role: string): boolean =>
        state.roles.includes(role),
  },

  actions: {
    update(authenticated: boolean, token?: string, parsed?: KeycloakTokenParsed) {
      this.isAuthenticated = authenticated;
      this.token = token ?? null;
      this.username = (parsed?.['preferred_username'] as string | undefined) ?? null;
      this.roles = (parsed?.['realm_access'] as { roles?: string[] } | undefined)?.roles ?? [];
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
