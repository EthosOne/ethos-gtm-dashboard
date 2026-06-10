"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Pillar = {
  id: number;
  name: string;
  status: "pending" | "active" | "error";
  last_event: string | null;
  updated_at: string;
};

// Brand colours — Ethos One 2026
const LIGHT = {
  bg:           "#E3E1E8",
  surface:      "#FFFFFF",
  surfaceAlt:   "#F5F3EF",
  border:       "rgba(54,53,65,0.12)",
  text:         "#363541",
  textMuted:    "#4A4858",
  textFaint:    "#7A7888",
  accent:       "#F4A988",
  logoFilter:   "none",
  toggleBg:     "#363541",
  toggleText:   "#E3E1E8",
};

const DARK = {
  bg:           "#363541",
  surface:      "#2A2935",
  surfaceAlt:   "#1F1E2B",
  border:       "rgba(227,225,232,0.08)",
  text:         "#E3E1E8",
  textMuted:    "#9D9BAA",
  textFaint:    "#5C5A6A",
  accent:       "#F4A988",
  logoFilter:   "brightness(0) invert(1)",
  toggleBg:     "#E3E1E8",
  toggleText:   "#363541",
};

const PILLAR_META: Record<string, { icon: string; gradient: string }> = {
  "Operations":     { icon: "bi-gear-fill",        gradient: "linear-gradient(135deg, #7A8A5C, #3F5847)" },
  "Content":        { icon: "bi-pencil-square",     gradient: "linear-gradient(135deg, #F4A988, #E37B5C)" },
  "Intent/Signals": { icon: "bi-broadcast",         gradient: "linear-gradient(135deg, #B7CCD8, #7E9AA8)" },
  "Outbound":       { icon: "bi-envelope-fill",     gradient: "linear-gradient(135deg, #E8B66A, #E37B5C)" },
  "Ads":            { icon: "bi-megaphone-fill",    gradient: "linear-gradient(135deg, #F4A988, #C1573B)" },
  "Optimisation":   { icon: "bi-graph-up",          gradient: "linear-gradient(135deg, #7E9AA8, #5C6B85)" },
};

const STATUS_DOT: Record<string, string> = {
  active:  "#7A8A5C",
  pending: "#E8B66A",
  error:   "#C1573B",
};

const STATUS_LABEL: Record<string, string> = {
  active:  "Active",
  pending: "Pending",
  error:   "Error",
};

export default function Dashboard() {
  const [pillars, setPillars]   = useState<Pillar[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const [dark, setDark]         = useState<boolean>(false);

  // persist theme
  useEffect(() => {
    const saved = localStorage.getItem("ethos-theme");
    if (saved === "dark") setDark(true);
  }, []);

  function toggleTheme() {
    setDark(prev => {
      localStorage.setItem("ethos-theme", !prev ? "dark" : "light");
      return !prev;
    });
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("pillars").select("*").order("id");
      if (data) {
        setPillars(data);
        setLastRefresh(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
      }
    }
    load();
    const channel = supabase
      .channel("pillars-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "pillars" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const t = dark ? DARK : LIGHT;
  const active  = pillars.filter(p => p.status === "active").length;
  const errors  = pillars.filter(p => p.status === "error").length;

  return (
    <main style={{
      background: t.bg,
      minHeight: "100vh",
      transition: "background 0.3s ease",
      padding: "0",
      overflowX: "hidden",
    }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2.5rem", flexWrap: "wrap", gap: 16 }}>
          <div>
            <img
              src="/ethos-wordmark.png"
              alt="Ethos One"
              style={{ height: 28, marginBottom: 10, display: "block", filter: t.logoFilter, transition: "filter 0.3s" }}
            />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: t.text, letterSpacing: "-0.02em" }}>
              Company OS
            </h1>
            <p style={{ color: t.textMuted, marginTop: 3, fontSize: "0.875rem", fontWeight: 400 }}>
              GTM · 6 Pillars · Live
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {/* Kanban link */}
              <a href="/kanban" style={{
                background: "none",
                border: `1px solid ${t.border}`,
                color: t.textMuted,
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: "0.78rem",
                fontWeight: 600,
                textDecoration: "none",
                letterSpacing: "0.04em",
                fontFamily: "inherit",
              }}>
                Kanban →
              </a>
              {/* Analytics link */}
              <a href="/analytics" style={{
                background: "none",
                border: `1px solid ${t.border}`,
                color: t.textMuted,
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: "0.78rem",
                fontWeight: 600,
                textDecoration: "none",
                letterSpacing: "0.04em",
                transition: "border-color 0.15s, color 0.15s",
                fontFamily: "inherit",
              }}>
                Analytics →
              </a>
              {/* Pipeline link */}
              <a href="/leads" style={{
                background: "none",
                border: `1px solid ${t.border}`,
                color: t.textMuted,
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: "0.78rem",
                fontWeight: 600,
                textDecoration: "none",
                letterSpacing: "0.04em",
                transition: "border-color 0.15s, color 0.15s",
                fontFamily: "inherit",
              }}>
                Pipeline →
              </a>
              <a href="/admin" style={{
                background: "none",
                border: `1px solid ${t.border}`,
                color: t.textFaint,
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: "0.78rem",
                fontWeight: 600,
                textDecoration: "none",
                letterSpacing: "0.04em",
                fontFamily: "inherit",
              }}>
                Admin
              </a>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                background: t.toggleBg,
                color: t.toggleText,
                border: "none",
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.04em",
                transition: "background 0.3s, color 0.3s",
                fontFamily: "inherit",
              }}
            >
              <i className={dark ? "bi bi-sun-fill" : "bi bi-moon-half"} style={{ marginRight: 5, color: "inherit" }} />{dark ? "Light" : "Dark"}
            </button>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              style={{
                background: "none",
                border: `1px solid ${t.border}`,
                color: t.textFaint,
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.04em",
                fontFamily: "inherit",
              }}
            >
              Sign out
            </button>
            </div>

            {/* Stats */}
            <div style={{ textAlign: "right", fontSize: "0.8rem" }}>
              <div style={{ color: t.textMuted }}>
                <span style={{ color: STATUS_DOT.active, fontWeight: 600 }}>{active}</span>
                <span style={{ color: t.textFaint }}> / 6 active</span>
              </div>
              {errors > 0 && (
                <div style={{ color: STATUS_DOT.error, fontWeight: 600 }}>{errors} error{errors > 1 ? "s" : ""}</div>
              )}
              <div style={{ color: t.textFaint, marginTop: 2 }}>Updated {lastRefresh || "—"}</div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: t.border, marginBottom: "2rem" }} />

        {/* Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1rem",
        }}>
          {pillars.map(p => {
            const meta = PILLAR_META[p.name] ?? { icon: "◆", gradient: "linear-gradient(135deg, #9D9BAA, #5C5A6A)" };
            return (
              <div
                key={p.id}
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 14,
                  padding: "1.25rem",
                  transition: "background 0.3s, border 0.3s",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {/* Card header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {/* Icon orb */}
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: meta.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    color: "#fff",
                    flexShrink: 0,
                  }}>
                    <i className={meta.icon} />
                  </div>

                  {/* Status badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: STATUS_DOT[p.status],
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: STATUS_DOT[p.status],
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: t.text, letterSpacing: "-0.01em" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 500, color: t.textMuted, marginTop: 3, lineHeight: 1.4 }}>
                    {p.last_event ?? "No events yet"}
                  </div>
                </div>

                {/* Timestamp */}
                <div style={{
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  color: t.textFaint,
                  borderTop: `1px solid ${t.border}`,
                  paddingTop: 8,
                  marginTop: "auto",
                }}>
                  {new Date(p.updated_at).toLocaleString("en-GB", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: "3rem",
          paddingTop: "1.5rem",
          borderTop: `1px solid ${t.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          color: t.textFaint,
        }}>
          <span>Ethos One · Company OS · 2026</span>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#7A8A5C",
            display: "inline-block",
            boxShadow: "0 0 6px #7A8A5C",
          }} title="Realtime connected" />
        </div>
      </div>
    </main>
  );
}
