import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

/**
 * As chaves vêm de variáveis de ambiente (arquivo .env, veja .env.example)
 * em vez de ficarem escritas direto no código — assim o repositório pode
 * ir para o GitHub (inclusive público) sem expor nada sensível.
 *
 * Preencha o .env com os valores de:
 * Firebase Console > ⚙️ Configurações do projeto > Seus apps > SDK setup and configuration
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);

// App Check: comprova para o Firebase que as requisições vêm do SEU app de
// verdade (e não de um script/robô batendo direto na API). Ative o reCAPTCHA
// v3 no Firebase Console > App Check, e cole a "site key" no .env.
// Sem VITE_RECAPTCHA_SITE_KEY preenchida, o App Check fica desativado
// (o app continua funcionando normalmente, só sem essa camada extra).
if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// mantém uma cópia local dos dados (funciona offline) e sincroniza
// automaticamente com o Firestore assim que a conexão voltar
enableIndexedDbPersistence(db).catch(() => {
  /* modo privado do navegador ou múltiplas abas abertas — ignora silenciosamente */
});
