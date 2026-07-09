import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, collection, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { Fingerprint } from "lucide-react";
import { auth, db } from "./firebase";
import Dashboard, { defaultAppSettings, newVehicle } from "./dashboard";
import { AuthScreens } from "./auth";
import RoleManager from "./roles";
import { hasBiometricRegistered, verifyBiometric } from "./webauthn";

const C = { bg: "#0D0F13", text: "#EDEEF0", textMuted: "#8993A4", surface: "#161922", border: "#2A2F3A", info: "#5EC8D8" };

function Splash({ text }) {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontFamily: "Inter, sans-serif", fontSize: 14 }}>
      {text || "Carregando…"}
    </div>
  );
}

function BiometricLockScreen({ onUnlock, onFallback }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const tryUnlock = async () => {
    setBusy(true); setFailed(false);
    const ok = await onUnlock();
    setBusy(false);
    if (!ok) setFailed(true);
  };

  useEffect(() => { tryUnlock(); }, []); // já tenta assim que a tela abre

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, sans-serif", color: C.text, gap: 18 }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.info }}>
        <Fingerprint size={32} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 16 }}>Confirme sua biometria</div>
      {failed && <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", maxWidth: 260 }}>Não foi possível confirmar. Tente de novo ou entre com sua senha.</div>}
      <button onClick={tryUnlock} disabled={busy}
        style={{ background: C.text, color: C.bg, border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
        {busy ? "Verificando…" : "Tentar novamente"}
      </button>
      <button onClick={onFallback} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>
        Entrar com e-mail e senha
      </button>
    </div>
  );
}

function Root() {
  const [authUser, setAuthUser] = useState(undefined); // undefined=carregando, null=deslogado
  const [userDoc, setUserDoc] = useState(null);
  const [vehicles, setVehicles] = useState(null);
  const [screen, setScreen] = useState("dashboard");
  const [biometricChecked, setBiometricChecked] = useState(true);

  useEffect(() => onAuthStateChanged(auth, setAuthUser), []);

  useEffect(() => {
    if (!authUser) { setUserDoc(null); setVehicles(null); return; }
    const unsubUser = onSnapshot(doc(db, "users", authUser.uid), (snap) => {
      setUserDoc(snap.exists() ? snap.data() : null);
    });
    const unsubVeh = onSnapshot(collection(db, "users", authUser.uid, "vehicles"), (qs) => {
      setVehicles(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubUser(); unsubVeh(); };
  }, [authUser?.uid]);

  // trava de biometria: só entra em cena se o usuário ativou isso nas configurações
  useEffect(() => {
    if (authUser && hasBiometricRegistered()) setBiometricChecked(false);
    else setBiometricChecked(true);
  }, [authUser?.uid]);

  const confirmBiometric = useCallback(async () => {
    const ok = await verifyBiometric();
    if (ok) setBiometricChecked(true);
    return ok;
  }, []);

  const update = useCallback((fn) => {
    if (!authUser || !vehicles || !vehicles.length) return;
    const v = vehicles.find((x) => x.id === userDoc?.activeVehicleId) || vehicles[0];
    if (!v) return;
    const draft = structuredClone(v);
    fn(draft);
    const { id, ...fields } = draft;
    setDoc(doc(db, "users", authUser.uid, "vehicles", id), fields);
  }, [authUser, vehicles, userDoc]);

  const updateAppSettings = useCallback((fn) => {
    if (!authUser) return;
    const draft = structuredClone(userDoc?.appSettings || defaultAppSettings());
    fn(draft);
    setDoc(doc(db, "users", authUser.uid), { appSettings: draft }, { merge: true });
  }, [authUser, userDoc]);

  const selectVehicle = useCallback((id) => {
    if (!authUser) return;
    updateDoc(doc(db, "users", authUser.uid), { activeVehicleId: id });
  }, [authUser]);

  const addVehicle = useCallback((name, type) => {
    if (!authUser) return;
    const v = newVehicle(name || (type === "moto" ? "Nova Moto" : "Novo Carro"), type);
    const { id, ...fields } = v;
    setDoc(doc(db, "users", authUser.uid, "vehicles", id), fields).then(() =>
      updateDoc(doc(db, "users", authUser.uid), { activeVehicleId: id })
    );
  }, [authUser]);

  const removeVehicle = useCallback((id) => {
    if (!authUser || !vehicles || vehicles.length <= 1) return;
    deleteDoc(doc(db, "users", authUser.uid, "vehicles", id)).then(() => {
      if (userDoc?.activeVehicleId === id) {
        const next = vehicles.find((v) => v.id !== id);
        if (next) updateDoc(doc(db, "users", authUser.uid), { activeVehicleId: next.id });
      }
    });
  }, [authUser, vehicles, userDoc]);

  if (authUser === undefined) return <Splash />;
  if (!authUser) return <AuthScreens />;
  if (!userDoc || vehicles === null) return <Splash text="Carregando seus dados…" />;
  if (!biometricChecked) {
    return <BiometricLockScreen onUnlock={confirmBiometric} onFallback={() => signOut(auth)} />;
  }
  if (screen === "roles" && userDoc.role === "administrador") {
    return <RoleManager myUid={authUser.uid} onBack={() => setScreen("dashboard")} />;
  }

  return (
    <Dashboard
      uid={authUser.uid}
      email={authUser.email}
      role={userDoc.role}
      vehicles={vehicles}
      activeVehicleId={userDoc.activeVehicleId}
      appSettings={userDoc.appSettings || defaultAppSettings()}
      update={update}
      updateAppSettings={updateAppSettings}
      selectVehicle={selectVehicle}
      addVehicle={addVehicle}
      removeVehicle={removeVehicle}
      onLogout={() => signOut(auth)}
      onOpenRoleManager={() => setScreen("roles")}
    />
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(<Root />);
