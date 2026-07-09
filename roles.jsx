import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { ArrowLeft, ShieldCheck, User } from "lucide-react";

const C = {
  bg: "#0D0F13", surface: "#161922", surfaceAlt: "#1E2229", border: "#2A2F3A",
  borderSoft: "#20242D", text: "#EDEEF0", textMuted: "#8993A4", info: "#5EC8D8",
};

export default function RoleManager({ onBack, myUid }) {
  const [users, setUsers] = useState(null);

  useEffect(() => {
    return onSnapshot(collection(db, "users"), (qs) => {
      setUsers(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const setRole = (uid, role) => updateDoc(doc(db, "users", uid), { role });

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter, sans-serif", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={onBack} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, cursor: "pointer" }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Gerenciar usuários</div>
        </div>

        {!users && <div style={{ color: C.textMuted }}>Carregando…</div>}

        {users && users.map((u) => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 4px", borderBottom: `1px solid ${C.borderSoft}` }}>
            {u.role === "administrador" ? <ShieldCheck size={18} color={C.info} /> : <User size={18} color={C.textMuted} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                {u.email}{u.id === myUid ? " (você)" : ""}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{u.role === "administrador" ? "Administrador" : "Público"}</div>
            </div>
            <select
              value={u.role}
              onChange={(e) => setRole(u.id, e.target.value)}
              style={{ background: C.surfaceAlt, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 8px", fontFamily: "Inter, sans-serif", fontSize: 13 }}
            >
              <option value="publico">Público</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
