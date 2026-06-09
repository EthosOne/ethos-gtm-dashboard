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
    background: "#E3E1E8",
    fontFamily: "var(--font-jakarta), system-ui, sans-serif",
  },
  card: {
    background: "#FFFFFF",
    border: "1px solid #B7CCD8",
    borderRadius: 16,
    padding: "48px 40px",
    width: "100%",
    maxWidth: 400,
    textAlign: "center",
    boxShadow: "0 4px 24px rgba(54,53,65,0.08)",
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: 16,
  },
  title: {
    color: "#363541",
    fontSize: 24,
    fontWeight: 700,
    margin: "0 0 4px",
  },
  subtitle: {
    color: "#5C6B85",
    fontSize: 14,
    margin: "0 0 32px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: {
    background: "#E3E1E8",
    border: "1px solid #B7CCD8",
    borderRadius: 8,
    color: "#363541",
    fontSize: 15,
    padding: "12px 16px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    background: "#C1573B",
    border: "none",
    borderRadius: 8,
    color: "#FFFFFF",
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
    color: "#5C6B85",
    cursor: "pointer",
    fontSize: 13,
    padding: "4px 0",
    appearance: "none",
  },
  hintText: {
    color: "#5C6B85",
    fontSize: 14,
    margin: "0 0 4px",
    lineHeight: 1.6,
  },
  errorText: {
    color: "#C1573B",
    fontSize: 13,
    margin: 0,
  },
};
