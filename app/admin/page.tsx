"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  // Change password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthorized(user?.user_metadata?.role === "admin");
    });
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteMsg("");
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json();
    setInviteMsg(data.message || (res.ok ? "Invite sent." : "Something went wrong."));
    if (res.ok) setInviteEmail("");
    setInviteLoading(false);
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

        {/* Invite user */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Invite a user</h2>
          <p style={s.cardSubtitle}>Sends an invite email via Supabase</p>
          <form onSubmit={handleInvite} style={s.form}>
            <input
              type="email"
              placeholder="teammate@ethosone.ai"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
              style={s.input}
            />
            <button type="submit" disabled={inviteLoading} style={s.button}>
              {inviteLoading ? "Sending…" : "Send invite"}
            </button>
          </form>
          {inviteMsg && <p style={s.success}>{inviteMsg}</p>}
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
  },
  wrapper: { width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 24 },
  header: { marginBottom: 8 },
  back: { fontSize: 13, color: "#7A7888", textDecoration: "none", fontWeight: 500 },
  title: { fontSize: 22, fontWeight: 700, color: "#363541", margin: "12px 0 4px" },
  subtitle: { fontSize: 14, color: "#7A7888", margin: 0 },
  card: {
    background: "#FFFFFF",
    borderRadius: 16,
    padding: "32px",
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
