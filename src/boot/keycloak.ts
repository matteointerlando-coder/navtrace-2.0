import { defineBoot } from '#q-app';
import Keycloak from 'keycloak-js';
import { useAuthStore } from '@/stores/auth-store';

const REDIRECT_URI = import.meta.env.VITE_KEYCLOAK_REDIRECT_URI!;

// Istanza singleton — importabile dagli altri moduli (es. interceptor Axios)
export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL!,
  realm: import.meta.env.VITE_KEYCLOAK_REALM!,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID!,
});


//console.log("Keycloak URL: ", import.meta.env.VITE_KEYCLOAK_URL, " Realm: ", import.meta.env.VITE_KEYCLOAK_REALM, " Client ID: ", import.meta.env.VITE_KEYCLOAK_CLIENT_ID, " Redirect URI: ", REDIRECT_URI);
// Route accessibili senza autenticazione
const PUBLIC_PATHS = ['/signin/callback'];

export default defineBoot(async ({ router }) => {
  // check-sso: se c'è un code+state in URL li scambia automaticamente (callback),
  // altrimenti verifica la sessione esistente senza redirectare.
  await keycloak.init();
    
  
  const auth = useAuthStore();
  auth.update(keycloak.authenticated ?? false, keycloak.token, keycloak.tokenParsed);

  
  // Rinnovo automatico del token 30s prima della scadenza
  keycloak.onTokenExpired = () => {
    keycloak
      .updateToken(30)
      .then(() => {
        auth.update(true, keycloak.token, keycloak.tokenParsed);
      })
      .catch(() => {
        void keycloak.login({ redirectUri: REDIRECT_URI });
      });
  };

  // Navigation guard: protegge tutte le route non pubbliche
  router.beforeEach((to) => {
    if (PUBLIC_PATHS.includes(to.path)) return true;

    if (!keycloak.authenticated) {
      void keycloak.login({ redirectUri: REDIRECT_URI });
      return false;
    }

    return true;
  });

});
