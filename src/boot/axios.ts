import { defineBoot } from '#q-app';
import axios from 'axios';
import { keycloak } from './keycloak';

// Istanza axios condivisa in tutta l'app.
// baseURL viene letta dal file .env (VITE_AIS_API_URL).
export const api = axios.create({
  baseURL: import.meta.env.VITE_AIS_API_URL as string,
});

export default defineBoot(() => {
  api.interceptors.request.use((config) => {
    if (keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    console.log('[API REQUEST]', config.method?.toUpperCase(), (config.baseURL ?? '') + (config.url ?? ''), config.params);
    console.log('[AUTH] authenticated:', keycloak.authenticated, '| token presente:', !!keycloak.token, '| scaduto:', keycloak.isTokenExpired());
    //console.log('Token:', keycloak.token);
    return config;
  });

  api.interceptors.response.use(
    (response) => {
      console.log('[API RESPONSE]', response.status, response.config.url, response.data);
      return response;
    },
    (error) => {
      console.error('[API ERROR]', error.response?.status, error.response?.config?.url, error.response?.data);
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    },
  );
});
