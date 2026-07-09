/**
 * Trava de conveniência por biometria (digital / Face ID / desbloqueio de tela).
 *
 * IMPORTANTE: isso usa a API nativa do navegador (WebAuthn) para pedir uma
 * confirmação biométrica no aparelho. Quem realmente mantém a sessão logada
 * é o Firebase Auth (persistência local) — a biometria aqui é só uma trava
 * extra de conveniência para abrir o app sem digitar a senha de novo, e não
 * substitui a autenticação real do Firebase.
 */

const CRED_ID_KEY = "vt-biometric-credential-id";
const CRED_UID_KEY = "vt-biometric-uid";

export function isWebAuthnAvailable() {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

export function hasBiometricRegistered() {
  return !!localStorage.getItem(CRED_ID_KEY);
}

export function clearBiometric() {
  localStorage.removeItem(CRED_ID_KEY);
  localStorage.removeItem(CRED_UID_KEY);
}

function b64urlToBuffer(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}

export async function registerBiometric(uid, email) {
  if (!isWebAuthnAvailable()) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Painel do Veículo" },
        user: {
          id: new TextEncoder().encode(uid),
          name: email || "usuario",
          displayName: email || "usuario",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
      },
    });
    if (!credential) return false;
    localStorage.setItem(CRED_ID_KEY, credential.id);
    localStorage.setItem(CRED_UID_KEY, uid);
    return true;
  } catch (e) {
    return false;
  }
}

export async function verifyBiometric() {
  const credId = localStorage.getItem(CRED_ID_KEY);
  if (!credId || !isWebAuthnAvailable()) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: b64urlToBuffer(credId), type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch (e) {
    return false;
  }
}
