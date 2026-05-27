"use client";

import { useState } from "react";

const LIGHT = {
  bg: "#E3E1E8", surface: "#FFFFFF", surfaceAlt: "#F5F3EF",
  border: "rgba(54,53,65,0.12)", text: "#363541", textMuted: "#4A4858",
  textFaint: "#7A7888", accent: "#F4A988",
};
const DARK = {
  bg: "#363541", surface: "#2A2935", surfaceAlt: "#1F1E2B",
  border: "rgba(227,225,232,0.08)", text: "#E3E1E8", textMuted: "#9D9BAA",
  textFaint: "#5C5A6A", accent: "#F4A988",
};

type Status = "idle" | "loading" | "success" | "error";

export default function SubscribePage() {
  const [dark] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail]         = useState("");
  const [status, setStatus]       = useState<Status>("idle");
  const [errorMsg, setErrorMsg]   = useState("");

  const t = dark ? DARK : LIGHT;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), first_name: firstName.trim() || null }),
    });

    if (res.ok) {
      setStatus("success");
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <main style={{ background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <img src="/ethos-wordmark.png" alt="Ethos One"
            style={{ height: 28, marginBottom: 32, display: "block", marginLeft: "auto", marginRight: "auto" }} />
          <div style={{
            background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: 20, padding: "2.5rem 2rem",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>✓</div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: t.text, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              You&apos;re in.
            </h2>
            <p style={{ color: t.textMuted, fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>
              Welcome to <strong>The Weekly Lead Report</strong>.<br />
              Your first issue lands soon — keep an eye on your inbox.
            </p>
          </div>
          <p style={{ fontSize: "0.72rem", color: t.textFaint, marginTop: 24 }}>
            Ethos One · ethosone.ai
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 480, width: "100%" }}>

        <img src="/ethos-wordmark.png" alt="Ethos One"
          style={{ height: 28, marginBottom: 32, display: "block" }} />

        <div style={{
          background: t.surface, border: `1px solid ${t.border}`,
          borderRadius: 20, padding: "2.5rem 2rem",
        }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#F4A98822", borderRadius: 999,
            padding: "4px 12px", marginBottom: 20,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F4A988" }} />
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#C1573B", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Free Newsletter
            </span>
          </div>

          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: t.text, margin: "0 0 8px", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
            The Weekly Lead Report
          </h1>
          <p style={{ color: t.textMuted, fontSize: "0.875rem", lineHeight: 1.6, margin: "0 0 28px" }}>
            GTM insights, pipeline frameworks, and outbound tactics — delivered every week to founders and revenue teams.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="text"
              placeholder="First name (optional)"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              style={{
                background: t.surfaceAlt, border: `1px solid ${t.border}`,
                borderRadius: 10, padding: "12px 14px",
                fontSize: "0.875rem", color: t.text,
                outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
              }}
            />
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                background: t.surfaceAlt, border: `1px solid ${t.border}`,
                borderRadius: 10, padding: "12px 14px",
                fontSize: "0.875rem", color: t.text,
                outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
              }}
            />

            {status === "error" && (
              <div style={{ fontSize: "0.78rem", color: "#C1573B", padding: "8px 12px", background: "#C1573B11", borderRadius: 8 }}>
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                background: t.text, color: dark ? "#363541" : "#E3E1E8",
                border: "none", borderRadius: 10, padding: "13px 20px",
                fontSize: "0.875rem", fontWeight: 700, cursor: status === "loading" ? "not-allowed" : "pointer",
                opacity: status === "loading" ? 0.7 : 1,
                letterSpacing: "0.01em", fontFamily: "inherit",
                transition: "opacity 0.15s",
              }}
            >
              {status === "loading" ? "Subscribing…" : "Subscribe — it's free"}
            </button>
          </form>

          <p style={{ fontSize: "0.72rem", color: t.textFaint, marginTop: 16, textAlign: "center" }}>
            No spam. Unsubscribe anytime.
          </p>
        </div>

        <p style={{ fontSize: "0.72rem", color: t.textFaint, marginTop: 24, textAlign: "center" }}>
          Ethos One · ethosone.ai
        </p>
      </div>
    </main>
  );
}
