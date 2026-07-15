"use client";

import { useState } from "react";

const LIGHT = {
  bg: "#E3E1E8", surface: "#FFFFFF", surfaceAlt: "#F5F3EF",
  border: "rgba(54,53,65,0.12)", text: "#363541", textMuted: "#4A4858",
  textFaint: "#7A7888", accent: "#F4A988",
};

type Status = "idle" | "loading" | "success" | "error";

export default function AffiliatePage() {
  const t = LIGHT;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [howTo, setHowTo]         = useState("");
  const [status, setStatus]       = useState<Status>("idle");
  const [errorMsg, setErrorMsg]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !firstName.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    const res = await fetch("/api/affiliate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        email: email.trim(),
        how_to_promote: howTo.trim() || null,
      }),
    });

    if (res.ok) {
      setStatus("success");
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  const inputStyle: React.CSSProperties = {
    background: t.surfaceAlt, border: `1px solid ${t.border}`,
    borderRadius: 10, padding: "12px 14px",
    fontSize: "0.875rem", color: t.text,
    outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  if (status === "success") {
    return (
      <main style={{ background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <img src="/ethos-wordmark.png" alt="Ethos One"
            style={{ height: 28, marginBottom: 32, display: "block", marginLeft: "auto", marginRight: "auto" }} />
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: "2.5rem 2rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>✓</div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: t.text, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              Application received.
            </h2>
            <p style={{ color: t.textMuted, fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>
              Thanks for your interest in the Ethos One affiliate programme.<br />
              We&apos;ll be in touch shortly.
            </p>
          </div>
          <p style={{ fontSize: "0.72rem", color: t.textFaint, marginTop: 24 }}>Ethos One · ethosone.ai</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 480, width: "100%" }}>

        <img src="/ethos-wordmark.png" alt="Ethos One"
          style={{ height: 28, marginBottom: 32, display: "block" }} />

        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: "2.5rem 2rem" }}>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#F4A98822", borderRadius: 999,
            padding: "4px 12px", marginBottom: 20,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F4A988" }} />
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#C1573B", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Affiliate Programme
            </span>
          </div>

          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: t.text, margin: "0 0 8px", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
            Partner with Ethos One
          </h1>
          <p style={{ color: t.textMuted, fontSize: "0.875rem", lineHeight: 1.6, margin: "0 0 28px" }}>
            Refer companies to Ethos One and earn commission on every customer you bring in. Tell us a bit about yourself and how you plan to promote.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input
                type="text"
                placeholder="First name *"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <input
              type="email"
              placeholder="Your email address *"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
            <textarea
              placeholder="How do you plan to promote Ethos One? (audience, channels, content...)"
              value={howTo}
              onChange={e => setHowTo(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
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
                background: t.text, color: "#E3E1E8",
                border: "none", borderRadius: 10, padding: "13px 20px",
                fontSize: "0.875rem", fontWeight: 700,
                cursor: status === "loading" ? "not-allowed" : "pointer",
                opacity: status === "loading" ? 0.7 : 1,
                letterSpacing: "0.01em", fontFamily: "inherit",
                transition: "opacity 0.15s", appearance: "none",
              }}
            >
              {status === "loading" ? "Submitting…" : "Apply to become an affiliate"}
            </button>
          </form>

          <p style={{ fontSize: "0.72rem", color: t.textFaint, marginTop: 16, textAlign: "center" }}>
            We review every application manually.
          </p>
        </div>

        <p style={{ fontSize: "0.72rem", color: t.textFaint, marginTop: 24, textAlign: "center" }}>
          Ethos One · ethosone.ai
        </p>
      </div>
    </main>
  );
}
