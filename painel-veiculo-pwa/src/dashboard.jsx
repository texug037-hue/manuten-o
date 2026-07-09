import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Gauge, Fuel, Droplet, Disc, History, Settings, Plus, X,
  AlertTriangle, MapPin, ChevronRight, Car, Check, Trash2,
  Bell, Volume2, VolumeX, Vibrate, Sun, Moon, Play, ShieldCheck,
  Mail, Fingerprint
} from "lucide-react";
import { isWebAuthnAvailable, hasBiometricRegistered, registerBiometric, clearBiometric } from "./webauthn";

/* ---------------------------------------------------------
   TOKENS (two palettes; `C` is mutated in place so every
   component reading C.xxx re-renders with the active theme)
--------------------------------------------------------- */
const DARK_COLORS = {
  bg: "#0D0F13",
  surface: "#161922",
  surfaceAlt: "#1E2229",
  border: "#2A2F3A",
  borderSoft: "#20242D",
  text: "#EDEEF0",
  textMuted: "#8993A4",
  textFaint: "#5B6270",
  good: "#34D399",
  warn: "#F5A623",
  crit: "#EF4444",
  info: "#5EC8D8",
};

const LIGHT_COLORS = {
  bg: "#F3F4F7",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F2F5",
  border: "#E1E4EA",
  borderSoft: "#EAEBF0",
  text: "#14171D",
  textMuted: "#5B6270",
  textFaint: "#9299A6",
  good: "#0E9F6E",
  warn: "#C2760C",
  crit: "#DC2626",
  info: "#0E7C90",
};

let C = { ...DARK_COLORS };

function applyTheme(themeName) {
  Object.assign(C, themeName === "light" ? LIGHT_COLORS : DARK_COLORS);
}

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');`;

const STORAGE_KEY = "vt-data-v2";

const defaultConfig = () => ({
  tankCapacity: 50,
  reserveLiters: 3,
  oilInterval: 5000,
  tireInterval: 10000,
  oilAlertKm: 500,
  tireAlertKm: 500,
});

const newVehicle = (name, type) => ({
  id: uid(),
  name,
  type, // 'carro' | 'moto'
  config: defaultConfig(),
  currentOdometer: 0,
  fuelEntries: [],
  oilRecords: [],
  tireRecords: [],
});

const defaultAppSettings = () => ({
  theme: "dark",
  notifSound: true,
  notifVibration: true,
  notifTone: "classico",
  systemNotif: false,
});

const defaultData = () => {
  const car = newVehicle("Meu Carro", "carro");
  return { vehicles: [car], activeVehicleId: car.id, appSettings: defaultAppSettings() };
};

/* migrate legacy single-vehicle shape (STORAGE_KEY vt-data-v1) into v2 shape */
function migrateLegacy(old) {
  const car = {
    id: uid(),
    name: "Meu Carro",
    type: "carro",
    config: old.config || defaultConfig(),
    currentOdometer: old.currentOdometer || 0,
    fuelEntries: old.fuelEntries || [],
    oilRecords: old.oilRecords || [],
    tireRecords: old.tireRecords || [],
  };
  return { vehicles: [car], activeVehicleId: car.id, appSettings: defaultAppSettings() };
}

/* fills in appSettings for data saved before this feature existed */
function ensureAppSettings(d) {
  if (!d.appSettings) d.appSettings = defaultAppSettings();
  return d;
}

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtNum(n, d = 1) {
  return n === null || n === undefined || Number.isNaN(n) ? "—" : n.toFixed(d);
}
function fmtInt(n) {
  return n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : Math.round(n).toLocaleString("pt-BR");
}
function fmtBRL(n) {
  return n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const TONES = [
  { id: "classico", label: "Clássico", notes: [660] },
  { id: "suave", label: "Suave", notes: [440] },
  { id: "urgente", label: "Urgente", notes: [880, 660, 880] },
];

function playTone(toneId = "classico", severity = "warn") {
  try {
    const tone = TONES.find((t) => t.id === toneId) || TONES[0];
    const notes = severity === "crit" ? [...tone.notes, ...tone.notes] : tone.notes;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
      t += 0.28;
    });
  } catch (e) {
    /* audio not available, ignore */
  }
}

function fireVibration(severity = "warn") {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(severity === "crit" ? [200, 100, 200, 100, 200] : [150]);
    }
  } catch (e) {
    /* vibration not available, ignore */
  }
}

function sendSystemNotification(title, body) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, silent: true });
    }
  } catch (e) {
    /* notifications not available in this environment, ignore */
  }
}

async function requestSystemNotificationPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch (e) {
    return "unsupported";
  }
}

/* ---------------------------------------------------------
   CUSTOM ICON: motorcycle (line-art, matches lucide stroke style)
--------------------------------------------------------- */
function MotoIcon({ size = 18, color = "currentColor", strokeWidth = 2 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    >
      <circle cx="5.5" cy="17" r="2.6" />
      <circle cx="18.5" cy="17" r="2.6" />
      <path d="M8 17h5.5l2.3-5.2H19" />
      <path d="M8 17l1.8-5.2H13" />
      <path d="M15.2 8.6h2.1l1.7 3.2" />
      <path d="M4.8 13.8L7 9.4" />
    </svg>
  );
}

/* ---------------------------------------------------------
   PRIMITIVES
--------------------------------------------------------- */
function StateColor(state) {
  if (state === "crit") return C.crit;
  if (state === "warn") return C.warn;
  if (state === "good") return C.good;
  return C.textFaint;
}

function Pill({ state, children }) {
  const color = StateColor(state);
  return (
    <span
      style={{
        color, background: `${color}1A`, border: `1px solid ${color}40`,
        fontFamily: "Inter", fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
        padding: "3px 8px", borderRadius: 999, textTransform: "uppercase",
        display: "inline-flex", alignItems: "center", gap: 4,
      }}
    >
      {children}
    </span>
  );
}

function CircularGauge({ pct, state, centerLabel, centerSub, size = 208 }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamp(pct, 0, 100) / 100) * circ;
  const color = StateColor(state);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={C.borderSoft} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: size * 0.19, color: C.text, lineHeight: 1 }}>
          {centerLabel}
        </div>
        <div style={{ fontFamily: "Inter", fontSize: 12, color: C.textMuted, marginTop: 6, textAlign: "center", padding: "0 10px" }}>
          {centerSub}
        </div>
      </div>
    </div>
  );
}

function LinearBar({ pct, state }) {
  const color = StateColor(state);
  return (
    <div style={{ height: 8, borderRadius: 999, background: C.borderSoft, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", width: `${clamp(pct, 0, 100)}%`, background: color, borderRadius: 999, transition: "width 0.5s ease, background 0.4s ease" }} />
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, ...style }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontFamily: "Inter", fontSize: 12, color: C.textMuted, marginBottom: 6, fontWeight: 500 }}>
        {label}
      </div>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10,
  padding: "10px 12px", color: C.text, fontFamily: "JetBrains Mono", fontSize: 15,
  outline: "none", boxSizing: "border-box",
};

function NumInput(props) {
  return <input type="number" inputMode="decimal" style={inputStyle} {...props} />;
}

function TextInput(props) {
  return <input type="text" style={inputStyle} {...props} />;
}

function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", background: disabled ? C.borderSoft : C.text, color: disabled ? C.textFaint : C.bg,
        border: "none", borderRadius: 12, padding: "13px 16px", fontFamily: "Inter", fontWeight: 600, fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SegToggle({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3 }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
            background: value === opt.value ? C.text : "transparent",
            color: value === opt.value ? C.bg : C.textMuted,
            fontFamily: "Inter", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      style={{
        width: 44, height: 26, borderRadius: 999, border: "none", cursor: "pointer",
        background: checked ? C.info : C.borderSoft, position: "relative", flexShrink: 0,
        transition: "background 0.2s ease",
      }}
    >
      <div
        style={{
          position: "absolute", top: 3, left: checked ? 21 : 3, width: 20, height: 20,
          borderRadius: "50%", background: "#fff", transition: "left 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

function SettingRow({ icon, label, sub, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
      <div style={{ color: C.textMuted, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

/* ---------------------------------------------------------
   MAIN APP
--------------------------------------------------------- */
function Dashboard({
  uid, email, role,
  vehicles, activeVehicleId, appSettings,
  update, updateAppSettings, selectVehicle, addVehicle, removeVehicle,
  onLogout, onOpenRoleManager,
}) {
  const [tab, setTab] = useState("painel");
  const [showSettings, setShowSettings] = useState(false);
  const [showGarage, setShowGarage] = useState(false);
  const prevStates = useRef({ fuel: "good", oil: "good", tire: "good" });

  const vehicle = useMemo(() => {
    if (!vehicles || !vehicles.length) return null;
    return vehicles.find((v) => v.id === activeVehicleId) || vehicles[0];
  }, [vehicles, activeVehicleId]);

  // keep the color tokens in sync with the chosen theme, before anything renders
  if (appSettings) applyTheme(appSettings.theme);

  // if current vehicle is a moto and tab is pneus, bounce back to painel
  useEffect(() => {
    if (vehicle && vehicle.type === "moto" && tab === "pneus") setTab("painel");
  }, [vehicle, tab]);

  /* ---------- DERIVED / CALCULATIONS (for active vehicle) ---------- */
  const calc = useMemo(() => {
    if (!vehicle) return null;
    const { config, fuelEntries, oilRecords, tireRecords, currentOdometer, type } = vehicle;
    const sortedFuel = [...fuelEntries].sort((a, b) => a.odometer - b.odometer);
    const lastFuel = sortedFuel.length ? sortedFuel[sortedFuel.length - 1] : null;

    const validConsumptions = sortedFuel
      .map((f) => f.consumption)
      .filter((c) => typeof c === "number" && isFinite(c) && c > 0);
    const avgConsumption = validConsumptions.length
      ? validConsumptions.reduce((a, b) => a + b, 0) / validConsumptions.length
      : null;

    const effectiveOdometer = Math.max(currentOdometer || 0, lastFuel?.odometer || 0);
    const kmSinceFill = lastFuel ? effectiveOdometer - lastFuel.odometer : 0;
    const litersUsed = avgConsumption && lastFuel ? kmSinceFill / avgConsumption : 0;
    const estLitersRemaining = lastFuel ? clamp(config.tankCapacity - litersUsed, 0, config.tankCapacity) : null;
    const fuelPct = estLitersRemaining !== null ? (estLitersRemaining / config.tankCapacity) * 100 : null;
    const estRangeKm = estLitersRemaining !== null && avgConsumption
      ? Math.max(0, (estLitersRemaining - config.reserveLiters) * avgConsumption)
      : null;

    let fuelState = "none";
    if (estLitersRemaining !== null) {
      if (estLitersRemaining <= config.reserveLiters) fuelState = "crit";
      else if (estLitersRemaining <= config.reserveLiters + config.tankCapacity * 0.12) fuelState = "warn";
      else fuelState = "good";
    }

    const sortedOil = [...oilRecords].sort((a, b) => a.odometer - b.odometer);
    const lastOil = sortedOil.length ? sortedOil[sortedOil.length - 1] : null;
    const nextOilKm = lastOil ? lastOil.odometer + (lastOil.interval || config.oilInterval) : null;
    const kmToOil = nextOilKm !== null ? nextOilKm - effectiveOdometer : null;
    const oilPct = lastOil && nextOilKm
      ? clamp(((effectiveOdometer - lastOil.odometer) / (nextOilKm - lastOil.odometer)) * 100, 0, 100)
      : null;
    let oilState = "none";
    if (kmToOil !== null) {
      if (kmToOil <= 0) oilState = "crit";
      else if (kmToOil <= config.oilAlertKm) oilState = "warn";
      else oilState = "good";
    }

    let lastTire = null, nextTireKm = null, kmToTire = null, tirePct = null, tireState = "none";
    if (type !== "moto") {
      const sortedTire = [...tireRecords].sort((a, b) => a.odometer - b.odometer);
      lastTire = sortedTire.length ? sortedTire[sortedTire.length - 1] : null;
      nextTireKm = lastTire ? lastTire.odometer + (lastTire.interval || config.tireInterval) : null;
      kmToTire = nextTireKm !== null ? nextTireKm - effectiveOdometer : null;
      tirePct = lastTire && nextTireKm
        ? clamp(((effectiveOdometer - lastTire.odometer) / (nextTireKm - lastTire.odometer)) * 100, 0, 100)
        : null;
      if (kmToTire !== null) {
        if (kmToTire <= 0) tireState = "crit";
        else if (kmToTire <= config.tireAlertKm) tireState = "warn";
        else tireState = "good";
      }
    }

    return {
      sortedFuel, lastFuel, avgConsumption, effectiveOdometer, estLitersRemaining,
      fuelPct, estRangeKm, fuelState, lastOil, nextOilKm, kmToOil, oilPct, oilState,
      lastTire, nextTireKm, kmToTire, tirePct, tireState,
    };
  }, [vehicle]);

  // alert on newly-crossed thresholds: sound, vibration and system push,
  // each gated by the user's notification preferences
  useEffect(() => {
    if (!calc || !appSettings) return;
    const cur = { fuel: calc.fuelState, oil: calc.oilState, tire: calc.tireState };
    const prev = prevStates.current;
    const rank = { none: 0, good: 0, warn: 1, crit: 2 };
    const titles = {
      fuel: "Combustível baixo",
      oil: "Troca de óleo próxima",
      tire: "Revisão de pneus próxima",
    };
    const { notifSound, notifVibration, notifTone, systemNotif } = appSettings;
    Object.keys(cur).forEach((k) => {
      if (rank[cur[k]] > rank[prev[k]]) {
        const severity = cur[k] === "crit" ? "crit" : "warn";
        if (notifSound) playTone(notifTone, severity);
        if (notifVibration) fireVibration(severity);
        if (systemNotif) {
          sendSystemNotification(
            `${titles[k]} · ${vehicle?.name || ""}`,
            severity === "crit" ? "Atenção: limite atingido." : "Ficando perto do limite."
          );
        }
      }
    });
    prevStates.current = cur;
  }, [calc?.fuelState, calc?.oilState, calc?.tireState, appSettings, vehicle?.name]);

  if (!vehicle || !calc) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontFamily: "Inter" }}>
        <style>{FONT_IMPORT}</style>
        Carregando painel…
      </div>
    );
  }

  const alerts = [];
  if (calc.fuelState === "crit")
    alerts.push({
      icon: <Fuel size={16} />,
      text: `Reserva! Restam ~${fmtNum(calc.estLitersRemaining)} L · ${calc.estRangeKm !== null ? `${fmtInt(calc.estRangeKm)} km até secar` : "procure um posto"}`,
      state: "crit",
    });
  else if (calc.fuelState === "warn")
    alerts.push({ icon: <Fuel size={16} />, text: `Combustível ficando baixo · ${fmtNum(calc.estLitersRemaining)} L restantes`, state: "warn" });
  if (calc.oilState === "crit")
    alerts.push({ icon: <Droplet size={16} />, text: "Troca de óleo atrasada — agende agora", state: "crit" });
  else if (calc.oilState === "warn")
    alerts.push({ icon: <Droplet size={16} />, text: `Faltam ${fmtInt(calc.kmToOil)} km para a troca de óleo`, state: "warn" });
  if (vehicle.type !== "moto") {
    if (calc.tireState === "crit")
      alerts.push({ icon: <Disc size={16} />, text: "Rodízio/troca de pneus atrasado", state: "crit" });
    else if (calc.tireState === "warn")
      alerts.push({ icon: <Disc size={16} />, text: `Faltam ${fmtInt(calc.kmToTire)} km para revisar os pneus`, state: "warn" });
  }

  const navItems = [
    { id: "painel", label: "Painel", icon: Gauge },
    { id: "combustivel", label: "Abastecer", icon: Fuel },
    { id: "oleo", label: "Óleo", icon: Droplet },
    ...(vehicle.type !== "moto" ? [{ id: "pneus", label: "Pneus", icon: Disc }] : []),
    { id: "historico", label: "Histórico", icon: History },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "Inter", color: C.text, display: "flex", justifyContent: "center" }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* HEADER */}
        <div style={{ padding: "20px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "Inter", fontSize: 11, color: C.textFaint, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>
              Painel do Veículo
            </div>
            <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 20 }}>{vehicle.name}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              {fmtInt(calc.effectiveOdometer)} km rodados
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowGarage(true)}
              aria-label="Trocar de veículo"
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, cursor: "pointer" }}
            >
              <MotoIcon size={18} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Configurações"
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, cursor: "pointer" }}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {saveError && (
          <div style={{ margin: "0 20px 8px", color: C.warn, fontSize: 12, fontFamily: "Inter" }}>
            Não foi possível salvar os dados agora. Tentando novamente...
          </div>
        )}

        {/* CONTENT */}
        <div style={{ flex: 1, padding: "4px 20px 100px", overflowY: "auto" }}>
          {tab === "painel" && <PainelTab calc={calc} vehicle={vehicle} alerts={alerts} update={update} />}
          {tab === "combustivel" && <CombustivelTab calc={calc} vehicle={vehicle} update={update} />}
          {tab === "oleo" && <OleoTab calc={calc} vehicle={vehicle} update={update} />}
          {tab === "pneus" && vehicle.type !== "moto" && <PneusTab calc={calc} vehicle={vehicle} update={update} />}
          {tab === "historico" && <HistoricoTab vehicle={vehicle} update={update} />}
        </div>

        {/* BOTTOM NAV */}
        <div style={{ position: "fixed", bottom: 0, width: "100%", maxWidth: 480, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 6px calc(8px + env(safe-area-inset-bottom))" }}>
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            const badge =
              (id === "combustivel" && (calc.fuelState === "crit" || calc.fuelState === "warn")) ||
              (id === "oleo" && (calc.oilState === "crit" || calc.oilState === "warn")) ||
              (id === "pneus" && (calc.tireState === "crit" || calc.tireState === "warn"));
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", color: active ? C.text : C.textFaint, cursor: "pointer", position: "relative" }}
              >
                <div style={{ position: "relative" }}>
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                  {badge && (
                    <div style={{ position: "absolute", top: -3, right: -4, width: 7, height: 7, borderRadius: 999, background: C.crit }} />
                  )}
                </div>
                <div style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          vehicle={vehicle}
          update={update}
          appSettings={appSettings}
          updateAppSettings={updateAppSettings}
          email={email}
          role={role}
          uid={uid}
          onLogout={onLogout}
          onOpenRoleManager={onOpenRoleManager}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showGarage && (
        <GarageModal
          vehicles={vehicles}
          activeVehicleId={activeVehicleId}
          onSelect={selectVehicle}
          onAdd={addVehicle}
          onRemove={removeVehicle}
          onClose={() => setShowGarage(false)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   GARAGE MODAL (vehicle switcher)
--------------------------------------------------------- */
function GarageModal({ vehicles, activeVehicleId, onSelect, onAdd, onRemove, onClose }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("moto");

  const confirmAdd = () => {
    onAdd(name.trim(), type);
    setName("");
    setAdding(false);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.surface, width: "100%", maxWidth: 480, borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "85vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 17 }}>Meus veículos</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {vehicles.map((v) => {
            const active = v.id === activeVehicleId;
            return (
              <div
                key={v.id}
                onClick={() => onSelect(v.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
                  background: active ? `${C.info}14` : C.surfaceAlt,
                  border: `1px solid ${active ? C.info + "60" : C.border}`,
                  cursor: "pointer",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: active ? C.info : C.textMuted, flexShrink: 0 }}>
                  {v.type === "moto" ? <MotoIcon size={18} /> : <Car size={18} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{v.name}</div>
                  <div style={{ fontSize: 11, color: C.textFaint, fontFamily: "JetBrains Mono" }}>
                    {fmtInt(Math.max(v.currentOdometer || 0, v.fuelEntries.length ? Math.max(...v.fuelEntries.map((f) => f.odometer)) : 0))} km
                  </div>
                </div>
                {active && <Check size={18} color={C.info} />}
                {vehicles.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(v.id); }}
                    style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", padding: 4 }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!adding ? (
          <PrimaryButton onClick={() => setAdding(true)} style={{ background: C.surfaceAlt, color: C.text, border: `1px solid ${C.border}` }}>
            <Plus size={16} /> Adicionar veículo
          </PrimaryButton>
        ) : (
          <Card style={{ background: C.surfaceAlt }}>
            <Field label="Tipo">
              <SegToggle
                value={type}
                onChange={setType}
                options={[{ value: "moto", label: "Moto" }, { value: "carro", label: "Carro" }]}
              />
            </Field>
            <Field label="Nome / modelo">
              <TextInput placeholder={type === "moto" ? "ex: CB 650" : "ex: Onix"} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div style={{ display: "flex", gap: 8 }}>
              <PrimaryButton onClick={() => setAdding(false)} style={{ background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` }}>
                Cancelar
              </PrimaryButton>
              <PrimaryButton onClick={confirmAdd} disabled={!name.trim()}>
                Adicionar
              </PrimaryButton>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   PAINEL (DASHBOARD)
--------------------------------------------------------- */
function PainelTab({ calc, vehicle, alerts, update }) {
  const [odoInput, setOdoInput] = useState("");
  const isMoto = vehicle.type === "moto";

  const applyOdo = () => {
    const v = parseFloat(odoInput);
    if (!isFinite(v) || v <= 0) return;
    update((d) => { d.currentOdometer = v; });
    setOdoInput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((a, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 10, background: `${StateColor(a.state)}14`, border: `1px solid ${StateColor(a.state)}40`, borderRadius: 12, padding: "11px 13px", color: StateColor(a.state), fontSize: 13, fontWeight: 500 }}
            >
              {a.state === "crit" ? <AlertTriangle size={16} /> : a.icon}
              <span style={{ color: C.text }}>{a.text}</span>
            </div>
          ))}
        </div>
      )}

      <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 22 }}>
        <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <Fuel size={14} color={C.textMuted} />
          <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>NÍVEL DE COMBUSTÍVEL</span>
        </div>
        <CircularGauge
          pct={calc.fuelPct ?? 0}
          state={calc.fuelState}
          centerLabel={calc.estLitersRemaining !== null ? `${fmtNum(calc.estLitersRemaining)}L` : "—"}
          centerSub={calc.estRangeKm !== null ? `~${fmtInt(calc.estRangeKm)} km de autonomia` : "Registre um abastecimento"}
        />
        <div style={{ display: "flex", gap: 20, marginTop: 16 }}>
          <Stat label="Consumo médio" value={calc.avgConsumption ? `${fmtNum(calc.avgConsumption)} km/L` : "—"} />
          <Stat label="Tanque cheio" value={`${vehicle.config.tankCapacity} L`} />
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: isMoto ? "1fr" : "1fr 1fr", gap: 12 }}>
        <MiniGaugeCard
          icon={<Droplet size={15} />}
          title="Óleo"
          pct={calc.oilPct}
          state={calc.oilState}
          value={calc.kmToOil !== null ? `${fmtInt(Math.abs(calc.kmToOil))} km` : "sem registro"}
          sub={calc.kmToOil !== null ? (calc.kmToOil <= 0 ? "atrasado" : "restantes") : "toque em Óleo"}
        />
        {!isMoto && (
          <MiniGaugeCard
            icon={<Disc size={15} />}
            title="Pneus"
            pct={calc.tirePct}
            state={calc.tireState}
            value={calc.kmToTire !== null ? `${fmtInt(Math.abs(calc.kmToTire))} km` : "sem registro"}
            sub={calc.kmToTire !== null ? (calc.kmToTire <= 0 ? "atrasado" : "restantes") : "toque em Pneus"}
          />
        )}
      </div>

      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <MapPin size={14} color={C.textMuted} /> Atualizar quilometragem atual
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <NumInput placeholder={`Atual: ${fmtInt(calc.effectiveOdometer)} km`} value={odoInput} onChange={(e) => setOdoInput(e.target.value)} />
          <button onClick={applyOdo} style={{ background: C.text, color: C.bg, border: "none", borderRadius: 10, padding: "0 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            OK
          </button>
        </div>
        <div style={{ fontSize: 11, color: C.textFaint, marginTop: 8 }}>
          Use isso entre abastecimentos para manter as estimativas em dia.
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function MiniGaugeCard({ icon, title, pct, state, value, sub }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: C.textMuted }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
        <span style={{ marginLeft: "auto" }}>
          <Pill state={state === "none" ? "none" : state}>
            {state === "crit" ? "atrasado" : state === "warn" ? "atenção" : state === "good" ? "em dia" : "—"}
          </Pill>
        </span>
      </div>
      <LinearBar pct={pct ?? 0} state={state} />
      <div style={{ marginTop: 10, fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 16 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textFaint }}>{sub}</div>
    </Card>
  );
}

/* ---------------------------------------------------------
   COMBUSTÍVEL TAB
--------------------------------------------------------- */
function CombustivelTab({ calc, vehicle, update }) {
  const [mode, setMode] = useState("litros");
  const [odometer, setOdometer] = useState("");
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");

  const p = parseFloat(price);
  const l = parseFloat(liters);
  const c = parseFloat(cost);
  const computedCost = mode === "litros" && isFinite(l) && isFinite(p) ? l * p : null;
  const computedLiters = mode === "valor" && isFinite(c) && isFinite(p) && p > 0 ? c / p : null;

  const finalLiters = mode === "litros" ? l : computedLiters;
  const finalCost = mode === "litros" ? computedCost : c;

  const submit = () => {
    setError("");
    const odo = parseFloat(odometer);
    if (!isFinite(odo) || odo <= 0) return setError("Informe a quilometragem do veículo.");
    if (calc.lastFuel && odo <= calc.lastFuel.odometer)
      return setError(`A quilometragem deve ser maior que a do último abastecimento (${fmtInt(calc.lastFuel.odometer)} km).`);
    if (!isFinite(finalLiters) || finalLiters <= 0) return setError("Informe os litros ou o valor pago corretamente.");
    if (!isFinite(p) || p <= 0) return setError("Informe o preço por litro.");

    const kmSinceLast = calc.lastFuel ? odo - calc.lastFuel.odometer : 0;
    const consumption = calc.lastFuel && finalLiters > 0 ? kmSinceLast / finalLiters : null;

    update((d) => {
      d.fuelEntries.push({
        id: uid(), date, odometer: odo,
        liters: Number(finalLiters.toFixed(2)),
        cost: Number(finalCost.toFixed(2)),
        pricePerLiter: Number(p.toFixed(3)),
        kmSinceLast, consumption,
      });
      d.currentOdometer = Math.max(d.currentOdometer || 0, odo);
    });
    setOdometer(""); setLiters(""); setPrice(""); setCost("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
          Registrar abastecimento
        </div>

        <Field label="Data">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Quilometragem no painel">
          <NumInput placeholder="ex: 84210" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
        </Field>

        <Field label="Como quer informar?">
          <SegToggle value={mode} onChange={setMode} options={[{ value: "litros", label: "Litros" }, { value: "valor", label: "Valor (R$)" }]} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {mode === "litros" ? (
            <Field label="Litros abastecidos">
              <NumInput placeholder="ex: 35.5" value={liters} onChange={(e) => setLiters(e.target.value)} />
            </Field>
          ) : (
            <Field label="Valor pago (R$)">
              <NumInput placeholder="ex: 210.00" value={cost} onChange={(e) => setCost(e.target.value)} />
            </Field>
          )}
          <Field label="Preço por litro (R$)">
            <NumInput placeholder="ex: 5.89" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
        </div>

        <Card style={{ background: C.surfaceAlt, border: `1px dashed ${C.border}`, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: C.textMuted }}>{mode === "litros" ? "Total a pagar (calculado)" : "Litros abastecidos (calculado)"}</span>
            <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: C.info }}>
              {mode === "litros" ? fmtBRL(computedCost) : (computedLiters !== null ? `${fmtNum(computedLiters, 2)} L` : "—")}
            </span>
          </div>
        </Card>

        {error && <div style={{ color: C.crit, fontSize: 12, marginBottom: 10, marginTop: -6 }}>{error}</div>}

        <PrimaryButton onClick={submit}>
          <Plus size={16} /> Adicionar abastecimento
        </PrimaryButton>
      </Card>

      {calc.lastFuel && (
        <Card>
          <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 8 }}>ÚLTIMO REGISTRO</div>
          <FuelRow entry={calc.lastFuel} />
        </Card>
      )}
    </div>
  );
}

function FuelRow({ entry }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 15 }}>{fmtInt(entry.odometer)} km</div>
        <div style={{ fontSize: 11, color: C.textFaint }}>{fmtDate(entry.date)}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "JetBrains Mono", fontSize: 14 }}>{fmtNum(entry.liters, 1)} L · {fmtBRL(entry.cost)}</div>
        <div style={{ fontSize: 11, color: entry.consumption ? C.good : C.textFaint }}>
          {entry.consumption ? `${fmtNum(entry.consumption)} km/L` : "primeiro registro"}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   ÓLEO TAB
--------------------------------------------------------- */
function OleoTab({ calc, vehicle, update }) {
  const [odometer, setOdometer] = useState("");
  const [interval, setIntervalKm] = useState(String(vehicle.config.oilInterval));
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");

  const submit = () => {
    setError("");
    const odo = parseFloat(odometer);
    const iv = parseFloat(interval) || vehicle.config.oilInterval;
    if (!isFinite(odo) || odo <= 0) return setError("Informe a quilometragem da troca.");
    update((d) => {
      d.oilRecords.push({ id: uid(), date, odometer: odo, interval: iv });
      d.currentOdometer = Math.max(d.currentOdometer || 0, odo);
    });
    setOdometer("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <CircularGauge
          size={168}
          pct={calc.oilPct ?? 0}
          state={calc.oilState}
          centerLabel={calc.kmToOil !== null ? fmtInt(Math.abs(calc.kmToOil)) : "—"}
          centerSub={calc.kmToOil !== null ? (calc.kmToOil <= 0 ? "km em atraso" : "km até a troca") : "Sem registro de troca"}
        />
        {calc.lastOil && (
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 12 }}>
            Última troca: {fmtInt(calc.lastOil.odometer)} km · próxima em {fmtInt(calc.nextOilKm)} km
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
          Registrar troca de óleo
        </div>
        <Field label="Data">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Quilometragem da troca">
          <NumInput placeholder="ex: 140000" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
        </Field>
        <Field label="Intervalo até a próxima (km)">
          <NumInput value={interval} onChange={(e) => setIntervalKm(e.target.value)} />
        </Field>
        {error && <div style={{ color: C.crit, fontSize: 12, marginBottom: 10, marginTop: -6 }}>{error}</div>}
        <PrimaryButton onClick={submit}>
          <Plus size={16} /> Adicionar troca
        </PrimaryButton>
      </Card>

      {vehicle.oilRecords.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 10 }}>HISTÓRICO</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...vehicle.oilRecords].sort((a, b) => b.odometer - a.odometer).map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{fmtInt(r.odometer)} km</span>
                <span style={{ color: C.textFaint }}>{fmtDate(r.date)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   PNEUS TAB (carro only)
--------------------------------------------------------- */
function PneusTab({ calc, vehicle, update }) {
  const [odometer, setOdometer] = useState("");
  const [interval, setIntervalKm] = useState(String(vehicle.config.tireInterval));
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState("rodizio");
  const [error, setError] = useState("");

  const submit = () => {
    setError("");
    const odo = parseFloat(odometer);
    const iv = parseFloat(interval) || vehicle.config.tireInterval;
    if (!isFinite(odo) || odo <= 0) return setError("Informe a quilometragem do serviço.");
    update((d) => {
      d.tireRecords.push({ id: uid(), date, odometer: odo, interval: iv, type });
      d.currentOdometer = Math.max(d.currentOdometer || 0, odo);
    });
    setOdometer("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <CircularGauge
          size={168}
          pct={calc.tirePct ?? 0}
          state={calc.tireState}
          centerLabel={calc.kmToTire !== null ? fmtInt(Math.abs(calc.kmToTire)) : "—"}
          centerSub={calc.kmToTire !== null ? (calc.kmToTire <= 0 ? "km em atraso" : "km até revisar") : "Sem registro"}
        />
        {calc.lastTire && (
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 12 }}>
            Último serviço: {fmtInt(calc.lastTire.odometer)} km · próximo em {fmtInt(calc.nextTireKm)} km
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
          Registrar serviço de pneus
        </div>
        <Field label="Tipo de serviço">
          <SegToggle value={type} onChange={setType} options={[{ value: "rodizio", label: "Rodízio" }, { value: "troca", label: "Troca" }]} />
        </Field>
        <Field label="Data">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Quilometragem do serviço">
          <NumInput placeholder="ex: 90000" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
        </Field>
        <Field label="Intervalo até o próximo (km)">
          <NumInput value={interval} onChange={(e) => setIntervalKm(e.target.value)} />
        </Field>
        {error && <div style={{ color: C.crit, fontSize: 12, marginBottom: 10, marginTop: -6 }}>{error}</div>}
        <PrimaryButton onClick={submit}>
          <Plus size={16} /> Adicionar serviço
        </PrimaryButton>
      </Card>

      {vehicle.tireRecords.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 10 }}>HISTÓRICO</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...vehicle.tireRecords].sort((a, b) => b.odometer - a.odometer).map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{r.type === "troca" ? "Troca" : "Rodízio"} · {fmtInt(r.odometer)} km</span>
                <span style={{ color: C.textFaint }}>{fmtDate(r.date)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   HISTÓRICO TAB
--------------------------------------------------------- */
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} de ${y}`;
}

function groupByMonth(entries) {
  const map = {};
  entries.forEach((f) => {
    const key = (f.date || "").slice(0, 7);
    if (!key) return;
    if (!map[key]) map[key] = { key, liters: 0, cost: 0, km: 0, count: 0 };
    map[key].liters += f.liters || 0;
    map[key].cost += f.cost || 0;
    map[key].km += f.kmSinceLast || 0;
    map[key].count += 1;
  });
  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
}

function HistoricoTab({ vehicle, update }) {
  const removeFuel = (id) => update((d) => { d.fuelEntries = d.fuelEntries.filter((f) => f.id !== id); });

  const sorted = [...vehicle.fuelEntries].sort((a, b) => b.odometer - a.odometer);
  const ascending = [...vehicle.fuelEntries].sort((a, b) => a.odometer - b.odometer);
  const totalLiters = vehicle.fuelEntries.reduce((s, f) => s + f.liters, 0);
  const totalCost = vehicle.fuelEntries.reduce((s, f) => s + f.cost, 0);
  const totalKm = ascending.length ? ascending[ascending.length - 1].odometer - ascending[0].odometer : 0;
  const months = groupByMonth(vehicle.fuelEntries);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 18 }}>{fmtNum(totalLiters, 0)} L</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>total abastecido</div>
        </Card>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 18 }}>{fmtBRL(totalCost)}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>gasto em combustível</div>
        </Card>
      </div>

      <Card style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 20, color: C.info }}>{fmtInt(totalKm)} km</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>total de quilômetros rodados</div>
      </Card>

      {months.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 12 }}>FECHAMENTO MENSAL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {months.map((mo) => (
              <div key={mo.key} style={{ paddingBottom: 12, borderBottom: `1px solid ${C.borderSoft}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{monthLabel(mo.key)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 14 }}>{fmtInt(mo.km)} km</div>
                    <div style={{ fontSize: 10, color: C.textFaint }}>rodados</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 14 }}>{fmtNum(mo.liters, 0)} L</div>
                    <div style={{ fontSize: 10, color: C.textFaint }}>abastecidos</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 14 }}>{fmtBRL(mo.cost)}</div>
                    <div style={{ fontSize: 10, color: C.textFaint }}>gasto total</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 10 }}>ABASTECIMENTOS ({sorted.length})</div>
        {sorted.length === 0 && (
          <div style={{ color: C.textFaint, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
            Nenhum abastecimento registrado ainda.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sorted.map((f) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: `1px solid ${C.borderSoft}` }}>
              <FuelRow entry={f} />
              <button onClick={() => removeFuel(f.id)} style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", marginLeft: 10 }}>
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------
   SETTINGS MODAL
--------------------------------------------------------- */
function SettingsModal({ vehicle, update, appSettings, updateAppSettings, email, role, uid, onLogout, onOpenRoleManager, onClose }) {
  const [biometricOn, setBiometricOn] = useState(() => hasBiometricRegistered());
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricMsg, setBiometricMsg] = useState("");

  const toggleBiometric = async (wantOn) => {
    setBiometricMsg("");
    if (!wantOn) {
      clearBiometric();
      setBiometricOn(false);
      return;
    }
    if (!isWebAuthnAvailable()) {
      setBiometricMsg("Este aparelho/navegador não suporta biometria (WebAuthn).");
      return;
    }
    setBiometricBusy(true);
    const ok = await registerBiometric(uid, email);
    setBiometricBusy(false);
    setBiometricOn(ok);
    if (!ok) setBiometricMsg("Não foi possível registrar a biometria agora. Tente novamente.");
  };
  const [cfg, setCfg] = useState({ ...vehicle.config });
  const isMoto = vehicle.type === "moto";

  const [permStatus, setPermStatus] = useState(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );

  const toggleSystemNotif = async (wantOn) => {
    if (!wantOn) {
      updateAppSettings((s) => { s.systemNotif = false; });
      return;
    }
    const result = await requestSystemNotificationPermission();
    setPermStatus(result);
    updateAppSettings((s) => { s.systemNotif = result === "granted"; });
  };

  const save = () => {
    update((d) => {
      d.config = {
        tankCapacity: parseFloat(cfg.tankCapacity) || d.config.tankCapacity,
        reserveLiters: parseFloat(cfg.reserveLiters) || d.config.reserveLiters,
        oilInterval: parseFloat(cfg.oilInterval) || d.config.oilInterval,
        tireInterval: parseFloat(cfg.tireInterval) || d.config.tireInterval,
        oilAlertKm: parseFloat(cfg.oilAlertKm) || d.config.oilAlertKm,
        tireAlertKm: parseFloat(cfg.tireAlertKm) || d.config.tireAlertKm,
      };
    });
    onClose();
  };

  const permLabel = {
    granted: "Permitidas pelo navegador",
    denied: "Bloqueadas — habilite nas permissões do navegador",
    default: "Ainda não solicitadas",
    unsupported: "Não suportadas neste ambiente",
  }[permStatus] || "Ainda não solicitadas";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, width: "100%", maxWidth: 480, borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 17 }}>Configurações</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        {/* ---------- APARÊNCIA ---------- */}
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", margin: "16px 0 8px" }}>
          Aparência
        </div>
        <Card style={{ background: C.surfaceAlt, marginBottom: 14 }}>
          <SettingRow
            icon={appSettings.theme === "light" ? <Sun size={17} /> : <Moon size={17} />}
            label="Tema claro"
            sub={appSettings.theme === "light" ? "Ativado — toque para voltar ao escuro" : "Desativado — toque para ativar"}
            right={
              <Switch
                checked={appSettings.theme === "light"}
                onChange={(v) => updateAppSettings((s) => { s.theme = v ? "light" : "dark"; })}
              />
            }
          />
        </Card>

        {/* ---------- NOTIFICAÇÕES ---------- */}
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", margin: "0 0 8px" }}>
          Notificações
        </div>
        <Card style={{ background: C.surfaceAlt, marginBottom: 14 }}>
          <SettingRow
            icon={appSettings.notifSound ? <Volume2 size={17} /> : <VolumeX size={17} />}
            label="Som"
            sub="Toca um alerta quando um limite é atingido"
            right={<Switch checked={appSettings.notifSound} onChange={(v) => updateAppSettings((s) => { s.notifSound = v; })} />}
          />
          <div style={{ height: 1, background: C.borderSoft }} />
          <SettingRow
            icon={<Vibrate size={17} />}
            label="Vibração"
            sub="Vibra o aparelho junto com o alerta"
            right={<Switch checked={appSettings.notifVibration} onChange={(v) => updateAppSettings((s) => { s.notifVibration = v; })} />}
          />

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 8 }}>Tom do alerta</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TONES.map((t) => {
                const selected = appSettings.notifTone === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => updateAppSettings((s) => { s.notifTone = t.id; })}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 10,
                      background: selected ? `${C.info}14` : C.surface,
                      border: `1px solid ${selected ? C.info + "60" : C.border}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t.label}</div>
                    {selected && <Check size={15} color={C.info} />}
                    <button
                      onClick={(e) => { e.stopPropagation(); playTone(t.id, "warn"); }}
                      aria-label={`Testar tom ${t.label}`}
                      style={{
                        background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8,
                        width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                        color: C.textMuted, cursor: "pointer", flexShrink: 0,
                      }}
                    >
                      <Play size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card style={{ background: C.surfaceAlt, marginBottom: 14 }}>
          <SettingRow
            icon={<ShieldCheck size={17} />}
            label="Notificações do sistema"
            sub={permLabel}
            right={<Switch checked={appSettings.systemNotif} onChange={toggleSystemNotif} />}
          />
          {permStatus === "unsupported" && (
            <div style={{ fontSize: 11, color: C.textFaint, marginTop: 6, lineHeight: 1.5 }}>
              Neste modo de pré-visualização o navegador não permite notificações do sistema. Som, vibração e os
              banners dentro do app continuam funcionando normalmente — isso só afeta o aviso "empurrado" para
              fora do app.
            </div>
          )}
        </Card>

        {/* ---------- VEÍCULO ---------- */}
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", margin: "4px 0 8px" }}>
          {vehicle.name}
        </div>
        <Card style={{ marginBottom: 16 }}>
          <Field label="Capacidade do tanque (L)">
            <NumInput value={cfg.tankCapacity} onChange={(e) => setCfg({ ...cfg, tankCapacity: e.target.value })} />
          </Field>
          <Field label="Reserva (L)">
            <NumInput value={cfg.reserveLiters} onChange={(e) => setCfg({ ...cfg, reserveLiters: e.target.value })} />
          </Field>
          <Field label="Intervalo padrão de troca de óleo (km)">
            <NumInput value={cfg.oilInterval} onChange={(e) => setCfg({ ...cfg, oilInterval: e.target.value })} />
          </Field>
          <Field label="Avisar troca de óleo faltando (km)">
            <NumInput value={cfg.oilAlertKm} onChange={(e) => setCfg({ ...cfg, oilAlertKm: e.target.value })} />
          </Field>
          {!isMoto && (
            <>
              <Field label="Intervalo padrão de rodízio/troca de pneus (km)">
                <NumInput value={cfg.tireInterval} onChange={(e) => setCfg({ ...cfg, tireInterval: e.target.value })} />
              </Field>
              <Field label="Avisar pneus faltando (km)">
                <NumInput value={cfg.tireAlertKm} onChange={(e) => setCfg({ ...cfg, tireAlertKm: e.target.value })} />
              </Field>
            </>
          )}

          <PrimaryButton onClick={save} style={{ marginTop: 6 }}>
            Salvar configurações do veículo <ChevronRight size={16} />
          </PrimaryButton>
        </Card>

        {/* ---------- CONTA ---------- */}
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", margin: "4px 0 8px" }}>
          Conta
        </div>
        <Card style={{ background: C.surfaceAlt, marginBottom: 14 }}>
          <SettingRow icon={<Mail size={17} />} label={email} sub={role === "administrador" ? "Administrador" : "Público"} right={null} />
          <div style={{ height: 1, background: C.borderSoft, margin: "6px 0" }} />
          <SettingRow
            icon={<Fingerprint size={17} />}
            label="Entrar com biometria"
            sub="Usa a digital / desbloqueio de tela deste aparelho para abrir o app"
            right={<Switch checked={biometricOn} onChange={toggleBiometric} />}
          />
          {biometricBusy && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 6 }}>Aguardando confirmação do aparelho…</div>}
          {biometricMsg && <div style={{ fontSize: 11, color: C.warn, marginTop: 6 }}>{biometricMsg}</div>}
          {role === "administrador" && (
            <>
              <div style={{ height: 1, background: C.borderSoft, margin: "6px 0" }} />
              <button
                onClick={onOpenRoleManager}
                style={{ width: "100%", background: "none", border: "none", color: C.info, cursor: "pointer", textAlign: "left", padding: "10px 0", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
              >
                <ShieldCheck size={16} /> Gerenciar usuários (público / administrador)
              </button>
            </>
          )}
        </Card>

        <ChangePasswordCard />

        <PrimaryButton onClick={onLogout} style={{ background: "transparent", color: C.crit, border: `1px solid ${C.crit}40`, marginBottom: 8 }}>
          Sair da conta
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   TROCAR SENHA
--------------------------------------------------------- */
function passwordStrength(pw) {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte", "Muito forte"];
  const colors = [C.crit, C.crit, C.warn, C.warn, C.good, C.good];
  return { score, label: labels[score], color: colors[score] };
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const strength = passwordStrength(next);
  const canSubmit = current.length > 0 && next.length >= 6 && next === confirm && !busy;

  const submit = async () => {
    setError(""); setSuccess(false);
    if (next.length < 6) return setError("A nova senha precisa ter pelo menos 6 caracteres.");
    if (next !== confirm) return setError("A confirmação não é igual à nova senha.");
    setBusy(true);
    try {
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import("firebase/auth");
      const { auth } = await import("./firebase");
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, next);
      setSuccess(true);
      setCurrent(""); setNext(""); setConfirm("");
    } catch (e) {
      const map = {
        "auth/wrong-password": "Senha atual incorreta.",
        "auth/invalid-credential": "Senha atual incorreta.",
        "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente de novo.",
        "auth/weak-password": "Senha muito fraca — use pelo menos 6 caracteres.",
        "auth/requires-recent-login": "Por segurança, saia e entre de novo antes de trocar a senha.",
      };
      setError(map[e.code] || "Não foi possível trocar a senha agora.");
    }
    setBusy(false);
  };

  return (
    <Card style={{ background: C.surfaceAlt, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Trocar senha</div>
      <Field label="Senha atual">
        <TextInput type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      </Field>
      <Field label="Nova senha">
        <TextInput type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      </Field>
      {next.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: -8, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 999, background: C.borderSoft, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(strength.score / 5) * 100}%`, background: strength.color, transition: "width 0.2s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: strength.color, fontWeight: 600, whiteSpace: "nowrap" }}>{strength.label}</div>
        </div>
      )}
      <Field label="Confirmar nova senha">
        <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </Field>
      {error && <div style={{ color: C.crit, fontSize: 12, marginBottom: 10, marginTop: -6 }}>{error}</div>}
      {success && <div style={{ color: C.good, fontSize: 12, marginBottom: 10, marginTop: -6 }}>Senha alterada com sucesso.</div>}
      <PrimaryButton onClick={submit} disabled={!canSubmit}>
        {busy ? "Trocando…" : "Trocar senha"}
      </PrimaryButton>
    </Card>
  );
}

export default Dashboard;
export { defaultAppSettings, newVehicle, defaultConfig };
