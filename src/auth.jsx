import React, { useState, useEffect } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut,
} from "firebase/auth";
import { doc, setDoc, runTransaction } from "firebase/firestore";
import { auth, db } from "./firebase";
import { defaultAppSettings, newVehicle } from "./dashboard";

const C = {
  bg: "#0D0F13", surface: "#161922", surfaceAlt: "#1E2229", border: "#2A2F3A",
  text: "#EDEEF0", textMuted: "#8993A4", textFaint: "#5B6270", crit: "#EF4444", info: "#5EC8D8",
};

const inputStyle = {
  width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10,
  padding: "12px 14px", color: C.text, fontFamily: "Inter, sans-serif", fontSize: 15,
  outline: "none", boxSizing: "border-box",
};

function Shell({ children }) {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, sans-serif", color: C.text }}>
      <div style={{ width: "100%", maxWidth: 380 }}>{children}</div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ textAlign: "center", marginBottom: 28 }}>
      <img src="/icons/icon-192.png" alt="" style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 12 }} />
      <div style={{ fontWeight: 700, fontSize: 20 }}>Painel do Veículo</div>
    </div>
  );
}

function PasswordField({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder || "Senha"}
        autoComplete={autoComplete}
        style={{ ...inputStyle, paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Esconder senha" : "Mostrar senha"}
        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function ErrorBox({ message }) {
  if (!message) return null;
  return <div style={{ color: C.crit, fontSize: 13, marginBottom: 12 }}>{message}</div>;
}

function translateAuthError(code) {
  const map = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-not-found": "Não existe conta com esse e-mail.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Já existe uma conta com esse e-mail.",
    "auth/weak-password": "Senha muito fraca.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente de novo.",
    "auth/network-request-failed": "Falha de conexão. Verifique sua internet.",
  };
  return map[code] || "Não foi possível concluir. Tente novamente.";
}

function LoginScreen({ onGoSignup, onGoForgot }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  // atualiza o cronômetro do bloqueio temporário a cada segundo
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const locked = lockedUntil > now;
  const secondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const submit = async () => {
    if (locked) return;
    setError(""); setBusy(true);
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setFailCount(0);
    } catch (e) {
      setError(translateAuthError(e.code));
      // bloqueio progressivo no próprio navegador (10s, 20s, 40s...) além do
      // limite que o Firebase já aplica no servidor — dificulta tentativa
      // automatizada de adivinhar senha (força bruta)
      const next = failCount + 1;
      setFailCount(next);
      if (next >= 3) {
        const waitMs = Math.min(10000 * 2 ** (next - 3), 5 * 60 * 1000);
        setLockedUntil(Date.now() + waitMs);
      }
    }
    setBusy(false);
  };

  return (
    <Shell>
      <Logo />
      <input style={{ ...inputStyle, marginBottom: 12 }} placeholder="E-mail" value={email}
        onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMuted, marginBottom: 18, cursor: "pointer" }}>
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        Manter conectado neste aparelho
      </label>
      {locked && (
        <div style={{ color: C.crit, fontSize: 13, marginBottom: 12 }}>
          Muitas tentativas incorretas. Tente de novo em {secondsLeft}s.
        </div>
      )}
      <ErrorBox message={!locked ? error : ""} />
      <button onClick={submit} disabled={busy || locked || !email || !password}
        style={{ width: "100%", background: C.text, color: C.bg, border: "none", borderRadius: 12, padding: "13px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.6 : 1 }}>
        Entrar <ArrowRight size={16} />
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 13 }}>
        <button onClick={onGoForgot} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}>Esqueci minha senha</button>
        <button onClick={onGoSignup} style={{ background: "none", border: "none", color: C.info, cursor: "pointer", fontWeight: 600 }}>Criar conta</button>
      </div>
    </Shell>
  );
}

function SignupScreen({ onGoLogin }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(""); setBusy(true);
    try {
      const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + "Aa1!";
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), tempPassword);
      const uid = cred.user.uid;

      // primeira conta criada no projeto vira administrador automaticamente
      // (veja o passo "meta/adminBootstrap" no README) — as demais entram como "público"
      let assignedRole = "publico";
      try {
        await runTransaction(db, async (tx) => {
          const bootstrapRef = doc(db, "meta", "adminBootstrap");
          const snap = await tx.get(bootstrapRef);
          if (snap.exists() && snap.data().claimed === false) {
            assignedRole = "administrador";
            tx.update(bootstrapRef, { claimed: true });
          }
          tx.set(doc(db, "users", uid), {
            email: email.trim(), role: assignedRole, appSettings: defaultAppSettings(),
            activeVehicleId: null, createdAt: Date.now(),
          });
        });
      } catch (txErr) {
        await setDoc(doc(db, "users", uid), {
          email: email.trim(), role: "publico", appSettings: defaultAppSettings(),
          activeVehicleId: null, createdAt: Date.now(),
        });
      }

      const vehicle = newVehicle("Meu Carro", "carro");
      const { id, ...fields } = vehicle;
      await setDoc(doc(db, "users", uid, "vehicles", id), fields);
      await setDoc(doc(db, "users", uid), { activeVehicleId: id }, { merge: true });

      await sendPasswordResetEmail(auth, email.trim());
      await signOut(auth);
      setDone(true);
    } catch (e) {
      setError(translateAuthError(e.code));
    }
    setBusy(false);
  };

  if (done) {
    return (
      <Shell>
        <Logo />
        <div style={{ textAlign: "center", color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>
          Conta criada! Enviamos um e-mail para <b style={{ color: C.text }}>{email}</b> para você criar sua senha.
          Depois de definir a senha, volte aqui e faça login normalmente.
        </div>
        <button onClick={onGoLogin} style={{ width: "100%", marginTop: 20, background: C.surfaceAlt, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 16px", fontWeight: 600, cursor: "pointer" }}>
          Voltar para o login
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <Logo />
      <input style={{ ...inputStyle, marginBottom: 16 }} placeholder="Seu e-mail" value={email}
        onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <ErrorBox message={error} />
      <button onClick={submit} disabled={busy || !email}
        style={{ width: "100%", background: C.text, color: C.bg, border: "none", borderRadius: 12, padding: "13px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
        Cadastrar
      </button>
      <div style={{ fontSize: 12, color: C.textFaint, marginTop: 10, textAlign: "center" }}>
        Você vai receber um e-mail para criar sua senha.
      </div>
      <button onClick={onGoLogin} style={{ width: "100%", marginTop: 16, background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13 }}>
        Já tenho conta — entrar
      </button>
    </Shell>
  );
}

function ForgotScreen({ onGoLogin }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (e) {
      setError(translateAuthError(e.code));
    }
  };

  return (
    <Shell>
      <Logo />
      {sent ? (
        <div style={{ textAlign: "center", color: C.textMuted, fontSize: 14 }}>
          Enviamos um link para <b style={{ color: C.text }}>{email}</b> criar uma nova senha.
        </div>
      ) : (
        <>
          <input style={{ ...inputStyle, marginBottom: 16 }} placeholder="Seu e-mail" value={email}
            onChange={(e) => setEmail(e.target.value)} />
          <ErrorBox message={error} />
          <button onClick={submit} disabled={!email}
            style={{ width: "100%", background: C.text, color: C.bg, border: "none", borderRadius: 12, padding: "13px 16px", fontWeight: 600, cursor: "pointer" }}>
            Enviar link
          </button>
        </>
      )}
      <button onClick={onGoLogin} style={{ width: "100%", marginTop: 16, background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13 }}>
        Voltar para o login
      </button>
    </Shell>
  );
}

export function AuthScreens() {
  const [screen, setScreen] = useState("login");
  if (screen === "signup") return <SignupScreen onGoLogin={() => setScreen("login")} />;
  if (screen === "forgot") return <ForgotScreen onGoLogin={() => setScreen("login")} />;
  return <LoginScreen onGoSignup={() => setScreen("signup")} onGoForgot={() => setScreen("forgot")} />;
}
