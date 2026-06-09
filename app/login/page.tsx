"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      setError("Email not recognised. Contact your administrator.");
    } else {
      setStep("code");
    }
    setLoading(false);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setError("Invalid or expired code. Try again.");
    }
    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src="/ethos-symbol.png" alt="Ethos One" style={styles.logo} />
        <h1 style={styles.title}>Ethos One</h1>
        <p style={styles.subtitle}>Company OS</p>

        {step === "email" ? (
          <form onSubmit={handleSendCode} style={styles.form}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
            {error && <p style={styles.errorText}>{error}</p>}
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} style={styles.form}>
            <p style={styles.hintText}>
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              maxLength={6}
              style={{ ...styles.input, textAlign: "center", letterSpacing: 8, fontSize: 22 }}
              autoFocus
            />
            {error && <p style={styles.errorText}>{error}</p>}
            <button type="submit" disabled={loading || code.length < 6} style={styles.button}>
              {loading ? "Verifying…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("email"); setCode(""); setError(""); }}
              style={styles.backButton}
            >
              Use a different email
            </button>
          </form>
        )}
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
    maxWidth: 400,
    textAlign: "center",
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: 16,
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: 700,
    margin: "0 0 4px",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 14,
    margin: "0 0 32px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
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
  backButton: {
    background: "none",
    border: "none",
    color: "#6b7280",
    cursor: "pointer",
    fontSize: 13,
    padding: "4px 0",
    appearance: "none",
  },
  hintText: {
    color: "#9ca3af",
    fontSize: 14,
    margin: "0 0 4px",
    lineHeight: 1.6,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    margin: 0,
  },
};
