"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type UserRow = { id: string; email: string; name: string; role: string; created_at: string; last_sign_in: string | null };

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [resetMsg, setResetMsg] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);

  // Change password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

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
    setPwError("");
    setPwMsg("");
    if (newPassword !== confirmPassword) {
      setPwError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    setPwLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError("Could not update password. Try again.");
    } else {
      setPwMsg("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPwLoading(false);
  }

  if (authorized === null) return null;
  if (!authorized) return (
    <div style={s.container}><p style={{ color: "#E05C5C" }}>Access denied.</p></div>
  );

  return (
    <div style={s.container}>
      <div style={s.wrapper}>

        {/* Header */}
        <div style={s.header}>
          <a href="/" style={s.back}>← Dashboard</a>
          <h1 style={s.title}>Admin</h1>
          <p style={s.subtitle}>User management</p>
        </div>

        {/* Change password */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Change your password</h2>
          <form onSubmit={handleChangePassword} style={s.form}>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              style={s.input}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              style={s.input}
            />
            {pwError && <p style={s.error}>{pwError}</p>}
            {pwMsg && <p style={s.success}>{pwMsg}</p>}
            <button type="submit" disabled={pwLoading} style={s.button}>
              {pwLoading ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>

        {/* Users */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Users</h2>

          {isMobile ? (
            /* Mobile: card per user */
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              {users.length === 0 && <p style={{ color: "#7A7888", fontSize: 13 }}>Loading…</p>}
              {users.map(u => (
                <div key={u.id} style={{ border: "1px solid rgba(54,53,65,0.1)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#363541", fontSize: 13 }}>{u.name || "—"}</div>
                      <div style={{ color: "#4A4858", fontSize: 12, marginTop: 2, wordBreak: "break-all" }}>{u.email}</div>
                      <div style={{ color: "#7A7888", fontSize: 11, marginTop: 4 }}>
                        {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Never signed in"}
                      </div>
                    </div>
                    <span style={{ background: u.role === "admin" ? "#363541" : "#E3E1E8", color: u.role === "admin" ? "#fff" : "#4A4858", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                      {u.role}
                    </span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <button
                      onClick={() => handleResetPassword(u.id, u.email)}
                      style={{ background: "none", border: "1px solid rgba(54,53,65,0.2)", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#4A4858", cursor: "pointer" }}
                    >
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
            /* Desktop: table */
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 8 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(54,53,65,0.1)" }}>
                  {["Name", "Email", "Role", "Last sign in", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0 8px 10px 0", color: "#7A7888", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: "1px solid rgba(54,53,65,0.06)" }}>
                    <td style={{ padding: "10px 8px 10px 0", color: "#363541", fontWeight: 500 }}>{u.name}</td>
                    <td style={{ padding: "10px 8px 10px 0", color: "#4A4858" }}>{u.email}</td>
                    <td style={{ padding: "10px 8px 10px 0" }}>
                      <span style={{ background: u.role === "admin" ? "#363541" : "#E3E1E8", color: u.role === "admin" ? "#fff" : "#4A4858", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: "10px 0", color: "#7A7888" }}>
                      {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Never"}
                    </td>
                    <td style={{ padding: "10px 0 10px 8px" }}>
                      <button
                        onClick={() => handleResetPassword(u.id, u.email)}
                        style={{ background: "none", border: "1px solid rgba(54,53,65,0.2)", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: "#4A4858", cursor: "pointer" }}
                      >
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
                  <tr><td colSpan={5} style={{ padding: "16px 0", color: "#7A7888" }}>Loading…</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#E3E1E8",
    display: "flex",
    justifyContent: "center",
    padding: "48px 16px",
    fontFamily: "var(--font-jakarta), system-ui, sans-serif",
    overflowX: "hidden",
  },
  wrapper: { width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 24 },
  header: { marginBottom: 8 },
  back: { fontSize: 13, color: "#7A7888", textDecoration: "none", fontWeight: 500 },
  title: { fontSize: 22, fontWeight: 700, color: "#363541", margin: "12px 0 4px" },
  subtitle: { fontSize: 14, color: "#7A7888", margin: 0 },
  card: {
    background: "#FFFFFF",
    borderRadius: 16,
    padding: "24px 16px",
    border: "1px solid rgba(54,53,65,0.1)",
    boxShadow: "0 2px 12px rgba(54,53,65,0.06)",
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#363541", margin: "0 0 6px" },
  cardSubtitle: { fontSize: 13, color: "#7A7888", margin: "0 0 20px" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    background: "#F5F3EF",
    border: "1px solid rgba(54,53,65,0.15)",
    borderRadius: 8,
    color: "#363541",
    fontSize: 14,
    padding: "11px 14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    background: "#363541",
    border: "none",
    borderRadius: 8,
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    padding: "12px 16px",
    width: "100%",
    appearance: "none",
    marginTop: 4,
  },
  error: { fontSize: 13, color: "#E05C5C", margin: 0 },
  success: { fontSize: 13, color: "#4CAF7D", margin: 0 },
};
