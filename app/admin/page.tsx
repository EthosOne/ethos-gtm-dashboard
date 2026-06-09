"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const role = user?.user_metadata?.role;
      setAuthorized(role === "admin");
    });
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setMessage(data.message || (res.ok ? "Invite sent." : "Something went wrong."));
    if (res.ok) setEmail("");
    setLoading(false);
  }

  if (authorized === null) return null;
  if (!authorized) return (
    <div style={styles.container}>
      <p style={{ color: "#ef4444" }}>Access denied.</p>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>User Management</h1>
        <p style={styles.subtitle}>Invite a new user to the Company OS</p>

        <form onSubmit={handleInvite} style={styles.form}>
          <input
            type="email"
            placeholder="teammate@ethosone.ai"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Sending…" : "Send invite"}
          </button>
        </form>

        {message && <p style={styles.messageText}>{message}</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f1117",
    fontFamily: "var(--font-jakarta), system-ui, sans-serif",
  },
  card: {
    background: "#1a1d27",
    border: "1px solid #2a2d3a",
    borderRadius: 16,
    padding: "48px 40px",
    width: "100%",
    maxWidth: 420,
  },
  title: { color: "#ffffff", fontSize: 20, fontWeight: 700, margin: "0 0 6px" },
  subtitle: { color: "#6b7280", fontSize: 14, margin: "0 0 28px" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    background: "#0f1117",
    border: "1px solid #2a2d3a",
    borderRadius: 8,
    color: "#ffffff",
    fontSize: 15,
    padding: "12px 16px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    background: "#7c3aed",
    border: "none",
    borderRadius: 8,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    padding: "12px 16px",
    width: "100%",
    appearance: "none",
  },
  messageText: { color: "#9ca3af", fontSize: 13, marginTop: 12 },
};
