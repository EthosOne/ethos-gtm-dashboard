"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type UserRow = { id: string; email: string; name: string; role: string; created_at: string; last_sign_in: string | null };

const LIGHT = {
  bg: "#E3E1E8", surface: "#FFFFFF", surfaceAlt: "#F5F3EF",
  border: "rgba(54,53,65,0.1)", borderStrong: "rgba(54,53,65,0.15)",
  text: "#363541", textMuted: "#4A4858", textFaint: "#7A7888",
  toggleBg: "#363541", toggleText: "#E3E1E8",
  roleBg: "#363541", roleText: "#fff",
  roleViewerBg: "#E3E1E8", roleViewerText: "#4A4858",
  resetBorder: "rgba(54,53,65,0.2)", resetText: "#4A4858",
};
const DARK = {
  bg: "#1a1c24", surface: "#252730", surfaceAlt: "#1e2028",
  border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.12)",
  text: "#E3E1E8", textMuted: "#B0AEBE", textFaint: "#7A7888",
  toggleBg: "#E3E1E8", toggleText: "#363541",
  roleBg: "#E3E1E8", roleText: "#363541",
  roleViewerBg: "#363541", roleViewerText: "#B0AEBE",
  resetBorder: "rgba(255,255,255,0.15)", resetText: "#B0AEBE",
};

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [resetMsg, setResetMsg] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [dark, setDark] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  const t = dark ? DARK : LIGHT;

  useEffect(() => {
    if (localStorage.getItem("ethos-theme") === "dark") setDark(true);
  }, []);

  function toggleTheme() {
    setDark(d => { localStorage.setItem("ethos-theme", !d ? "dark" : "light"); return !d; });
  }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const isAdmin = user?.user_metadata?.role === "admin";
      setAuthorized(isAdmin);
      if (isAdmin) {
        fetch("/api/admin/users").then(r => r.json()).then(d => setUsers(d.users || []));
      }
    });
  }, []);

  async function handleResetPassword(userId: string, email: string) {
    setResetMsg(prev => ({ ...prev, [userId]: "Resetting…" }));
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (res.ok) {
      setResetMsg(prev => ({ ...prev, [userId]: `New password: ${data.tempPassword}` }));
    } else {
      setResetMsg(prev => ({ ...prev, [userId]: "Error. Try again." }));
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(""); setPwMsg("");
    if (newPassword !== confirmPassword) { setPwError("Passwords don't match."); return; }
    if (newPassword.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    setPwLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError("Could not update password. Try again.");
    } else {
      setPwMsg("Password updated successfully.");
      setNewPassword(""); setConfirmPassword("");
    }
    setPwLoading(false);
  }

  if (authorized === null) return null;
  if (!authorized) return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", justifyContent: "center", padding: "48px 16px" }}>
      <p style={{ color: "#E05C5C" }}>Access denied.</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", justifyContent: "center", padding: "48px 16px", fontFamily: "var(--font-jakarta), system-ui, sans-serif", overflowX: "hidden", transition: "background 0.3s" }}>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <a href="/" style={{ fontSize: 13, color: t.textFaint, textDecoration: "none", fontWeight: 500 }}>← Dashboard</a>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, margin: "12px 0 4px" }}>Admin</h1>
            <p style={{ fontSize: 14, color: t.textFaint, margin: 0 }}>User management</p>
          </div>
          <button onClick={toggleTheme} style={{ background: t.toggleBg, color: t.toggleText, border: "none", borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
            <i className={dark ? "bi bi-sun-fill" : "bi bi-moon-half"} style={{ marginRight: 5, color: t.toggleText }} />{dark ? "Light" : "Dark"}
          </button>
        </div>

        {/* Change password */}
        <div style={{ background: t.surface, borderRadius: 16, padding: "24px 16px", border: `1px solid ${t.border}`, boxShadow: "0 2px 12px rgba(54,53,65,0.06)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: t.text, margin: "0 0 14px" }}>Change your password</h2>
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
              style={{ background: t.surfaceAlt, border: `1px solid ${t.borderStrong}`, borderRadius: 8, color: t.text, fontSize: 14, padding: "11px 14px", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} />
            <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
              style={{ background: t.surfaceAlt, border: `1px solid ${t.borderStrong}`, borderRadius: 8, color: t.text, fontSize: 14, padding: "11px 14px", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} />
            {pwError && <p style={{ fontSize: 13, color: "#E05C5C", margin: 0 }}>{pwError}</p>}
            {pwMsg  && <p style={{ fontSize: 13, color: "#4CAF7D", margin: 0 }}>{pwMsg}</p>}
            <button type="submit" disabled={pwLoading}
              style={{ background: t.toggleBg, border: "none", borderRadius: 8, color: t.toggleText, cursor: pwLoading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, padding: "12px 16px", width: "100%", appearance: "none", marginTop: 4, fontFamily: "inherit", opacity: pwLoading ? 0.7 : 1 }}>
              {pwLoading ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>

        {/* Users */}
        <div style={{ background: t.surface, borderRadius: 16, padding: "24px 16px", border: `1px solid ${t.border}`, boxShadow: "0 2px 12px rgba(54,53,65,0.06)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: t.text, margin: "0 0 14px" }}>Users</h2>

          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {users.length === 0 && <p style={{ color: t.textFaint, fontSize: 13 }}>Loading…</p>}
              {users.map(u => (
                <div key={u.id} style={{ border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: t.text, fontSize: 13 }}>{u.name || "—"}</div>
                      <div style={{ color: t.textMuted, fontSize: 12, marginTop: 2, wordBreak: "break-all" }}>{u.email}</div>
                      <div style={{ color: t.textFaint, fontSize: 11, marginTop: 4 }}>
                        {u.last_sign_in ? `Last sign in: ${new Date(u.last_sign_in).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Never signed in"}
                      </div>
                    </div>
                    <span style={{ background: u.role === "admin" ? t.roleBg : t.roleViewerBg, color: u.role === "admin" ? t.roleText : t.roleViewerText, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                      {u.role}
                    </span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => handleResetPassword(u.id, u.email)}
                      style={{ background: "none", border: `1px solid ${t.resetBorder}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: t.resetText, cursor: "pointer", fontFamily: "inherit" }}>
                      <i className="bi bi-key" style={{ marginRight: 4 }} />Reset password
                    </button>
                    {resetMsg[u.id] && (
                      <p style={{ fontSize: 11, color: resetMsg[u.id].startsWith("New") ? "#4CAF7D" : "#E05C5C", margin: "6px 0 0" }}>
                        {resetMsg[u.id]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {["Name", "Email", "Role", "Last sign in", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0 8px 10px 0", color: t.textFaint, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                    <td style={{ padding: "10px 8px 10px 0", color: t.text, fontWeight: 500 }}>{u.name}</td>
                    <td style={{ padding: "10px 8px 10px 0", color: t.textMuted }}>{u.email}</td>
                    <td style={{ padding: "10px 8px 10px 0" }}>
                      <span style={{ background: u.role === "admin" ? t.roleBg : t.roleViewerBg, color: u.role === "admin" ? t.roleText : t.roleViewerText, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: "10px 0", color: t.textFaint }}>
                      {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Never"}
                    </td>
                    <td style={{ padding: "10px 0 10px 8px" }}>
                      <button onClick={() => handleResetPassword(u.id, u.email)}
                        style={{ background: "none", border: `1px solid ${t.resetBorder}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: t.resetText, cursor: "pointer", fontFamily: "inherit" }}>
                        <i className="bi bi-key" style={{ marginRight: 4 }} />Reset
                      </button>
                      {resetMsg[u.id] && (
                        <p style={{ fontSize: 11, color: resetMsg[u.id].startsWith("New") ? "#4CAF7D" : "#E05C5C", margin: "4px 0 0", whiteSpace: "nowrap" }}>
                          {resetMsg[u.id]}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: "16px 0", color: t.textFaint }}>Loading…</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
