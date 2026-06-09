"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import s from "./login.module.css";

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
    <div className={s.container}>
      <div className={s.card}>
        <img src="/ethos-symbol.png" alt="Ethos One" className={s.logo} />
        <h1 className={s.title}>Ethos One</h1>
        <p className={s.subtitle}>Company OS</p>

        {step === "email" ? (
          <form onSubmit={handleSendCode} className={s.form}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={s.input}
            />
            {error && <p className={s.errorText}>{error}</p>}
            <button type="submit" disabled={loading} className={s.button}>
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className={s.form}>
            <p className={s.hintText}>
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              maxLength={6}
              className={`${s.input} ${s.inputCode}`}
              autoFocus
            />
            {error && <p className={s.errorText}>{error}</p>}
            <button type="submit" disabled={loading || code.length < 6} className={s.button}>
              {loading ? "Verifying…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("email"); setCode(""); setError(""); }}
              className={s.backButton}
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
