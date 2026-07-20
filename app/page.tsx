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

type Signal = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  stage: string | null;
  beehiiv_engaged: boolean | null;
  linkedin_url: string | null;
  guest_signup_at: string | null;
  updated_at: string;
};

type Post = {
  id: string;
  title: string;
  web_url: string | null;
  publish_date: number | null;
  total_sent: number;
  unique_opens: number;
  open_rate: number;
  web_views: number;
};

export default function Dashboard() {
  const [pillars, setPillars]   = useState<Pillar[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const [dark, setDark]         = useState<boolean>(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [pulse, setPulse]       = useState({ subscribers: 0, engaged: 0, outreach: 0, opens: 0, openRate: 0, webViews: 0, postTitle: "" });
  const [signals, setSignals]   = useState<Signal[]>([]);
  const [drilldown, setDrilldown] = useState<"subscribers" | "engaged" | "outreach" | null>(null);
  const [drillItems, setDrillItems] = useState<{ label: string; sub: string }[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [toolHealth, setToolHealth] = useState<Record<string, { status: string; label: string }> | null>(null);

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

  useEffect(() => {
    const fetchHealth = () => fetch("/api/tool-health").then(r => r.json()).then(setToolHealth).catch(() => {});
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function loadDrilldown(type: "subscribers" | "engaged" | "outreach") {
    if (drilldown === type) { setDrilldown(null); return; }
    setDrilldown(type);
    setDrillLoading(true);
    if (type === "subscribers") {
      const { data } = await supabase
        .from("twlr_subscribers").select("email,first_name,last_name,subscribed_at").order("subscribed_at", { ascending: false }).limit(20);
      setDrillItems((data ?? []).map((r: { email: string; first_name: string | null; last_name: string | null; subscribed_at: string }) => ({
        label: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email,
        sub: r.email !== ([r.first_name, r.last_name].filter(Boolean).join(" ") || r.email)
          ? `${r.email} · ${new Date(r.subscribed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
          : new Date(r.subscribed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      })));
    } else if (type === "engaged") {
      const { data } = await supabase
        .from("contacts").select("first_name,last_name,company,last_event_at").eq("beehiiv_engaged", true).order("last_event_at", { ascending: false, nullsFirst: false }).limit(20);
      setDrillItems((data ?? []).map((r: { first_name: string | null; last_name: string | null; company: string | null; last_event_at: string | null }) => ({
        label: [r.first_name, r.last_name].filter(Boolean).join(" ") || "Unknown",
        sub: [r.company, r.last_event_at ? new Date(r.last_event_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null].filter(Boolean).join(" · "),
      })));
    } else {
      const { data } = await supabase
        .from("contacts").select("first_name,last_name,company,stage").eq("instantly_enrolled", true).order("updated_at", { ascending: false }).limit(20);
      setDrillItems((data ?? []).map((r: { first_name: string | null; last_name: string | null; company: string | null; stage: string | null }) => ({
        label: [r.first_name, r.last_name].filter(Boolean).join(" ") || "Unknown",
        sub: [r.company, r.stage].filter(Boolean).join(" · "),
      })));
    }
    setDrillLoading(false);
  }

  async function openSignalsPanel() {
    setPanelOpen(true);
    setPanelLoading(true);
    const [{ count: subs }, { count: eng }, { count: out }, { data: sig }, nlStats, nlPosts] = await Promise.all([
      supabase.from("twlr_subscribers").select("*", { count: "exact", head: true }),
      supabase.from("contacts").select("*", { count: "exact", head: true }).eq("beehiiv_engaged", true),
      supabase.from("contacts").select("*", { count: "exact", head: true }).eq("instantly_enrolled", true),
      supabase.from("contacts")
        .select("id,first_name,last_name,company,job_title,stage,beehiiv_engaged,linkedin_url,guest_signup_at,updated_at")
        .or("beehiiv_engaged.eq.true,stage.eq.Nurture")
        .not("first_name", "is", null)
        .order("updated_at", { ascending: false })
        .limit(10),
      fetch("/api/newsletter-stats").then(r => r.json()).catch(() => ({})),
      fetch("/api/newsletter-posts").then(r => r.json()).catch(() => []),
    ]);
    setPulse({
      subscribers: subs ?? 0,
      engaged:     eng  ?? 0,
      outreach:    out  ?? 0,
      opens:       nlStats.unique_opens ?? 0,
      openRate:    nlStats.open_rate    ?? 0,
      webViews:    nlStats.web_views    ?? 0,
      postTitle:   nlStats.post_title   ?? "",
    });
    setSignals((sig as Signal[]) ?? []);
    setPosts(Array.isArray(nlPosts) ? (nlPosts as Post[]) : []);
    setPanelLoading(false);
  }

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
              <i className={dark ? "bi bi-sun-fill" : "bi bi-moon-fill"} style={{ marginRight: 5, color: t.toggleText }} />{dark ? "Light" : "Dark"}
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
            const clickable = p.name === "Intent/Signals";
            return (
              <div
                key={p.id}
                onClick={clickable ? openSignalsPanel : undefined}
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 14,
                  padding: "1.25rem",
                  transition: "background 0.3s, border 0.3s",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  cursor: clickable ? "pointer" : "default",
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
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span>{new Date(p.updated_at).toLocaleString("en-GB", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                  })}</span>
                  {clickable && (
                    <span style={{ color: t.accent, fontWeight: 600 }}>View details →</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tool Health */}
        {toolHealth && (
          <div style={{ marginTop: "2rem", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "0.9rem 1.25rem" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: t.textFaint, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
              Tool Health
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                { key: "instantly", icon: "bi-envelope-check-fill", name: "Instantly", fallbackHref: "https://app.instantly.ai" },
                { key: "n8n",       icon: "bi-diagram-3-fill",      name: "n8n",       fallbackHref: "#" },
                { key: "beehiiv",   icon: "bi-newspaper",           name: "Beehiiv",   fallbackHref: "https://app.beehiiv.com" },
              ].map(({ key, icon, name, fallbackHref }) => {
                const tool = (toolHealth as Record<string, { status: string; label: string; url?: string }>)[key];
                const color = tool?.status === "ok" ? "#7A8A5C" : tool?.status === "warn" ? "#E8B66A" : "#C1573B";
                const link = tool?.url ?? fallbackHref;
                const inner = (
                  <>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                    <i className={`bi ${icon}`} style={{ color, fontSize: "0.8rem" }} />
                    <span>{name}</span>
                    <span style={{ color: t.textFaint, fontWeight: 400, fontSize: "0.7rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tool?.label ?? "—"}
                    </span>
                    <i className="bi bi-box-arrow-up-right" style={{ fontSize: "0.6rem", color: t.textFaint, marginLeft: 2, flexShrink: 0 }} />
                  </>
                );
                const sharedStyle: React.CSSProperties = {
                  display: "flex", alignItems: "center", gap: 7,
                  background: t.surfaceAlt, border: `1px solid ${t.border}`,
                  borderRadius: 8, padding: "6px 12px",
                  fontSize: "0.75rem", fontWeight: 600, color: t.text,
                  textDecoration: "none",
                  cursor: "pointer",
                };
                return link ? (
                  <a key={key} href={link} target="_blank" rel="noopener noreferrer" title={tool?.label ?? "—"} style={sharedStyle}>
                    {inner}
                  </a>
                ) : (
                  <div key={key} title={tool?.label ?? "—"} style={{ ...sharedStyle, cursor: "default" }}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

      {/* Intent/Signals slide panel */}
      <div
        onClick={() => setPanelOpen(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.4)",
          opacity: panelOpen ? 1 : 0,
          pointerEvents: panelOpen ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />
      <aside
        style={{
          position: "fixed", top: 0, right: 0, zIndex: 101,
          height: "100vh", width: "min(420px, 90vw)",
          background: t.surface,
          borderLeft: `1px solid ${t.border}`,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.18)",
          transform: panelOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Panel header */}
        <div style={{ padding: "1.5rem", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: PILLAR_META["Intent/Signals"].gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: "1rem",
            }}>
              <i className="bi-broadcast" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: t.text }}>Intent / Signals</div>
              <div style={{ fontSize: "0.72rem", color: t.textFaint }}>Newsletter & LinkedIn intent</div>
            </div>
          </div>
          <button onClick={() => setPanelOpen(false)} style={{
            background: "none", border: "none", color: t.textMuted,
            fontSize: "1.3rem", cursor: "pointer", lineHeight: 1, fontFamily: "inherit",
          }}>
            <i className="bi-x-lg" style={{ fontSize: "1rem" }} />
          </button>
        </div>

        {panelLoading ? (
          <div style={{ padding: "2rem 1.5rem", color: t.textMuted, fontSize: "0.9rem" }}>Loading…</div>
        ) : (
          <>
            {/* TWLR Pulse */}
            <div style={{ padding: "1.5rem", borderBottom: `1px solid ${t.border}` }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: t.textFaint, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                TWLR Pulse
              </div>
              {pulse.postTitle && (
                <div style={{ fontSize: "0.68rem", color: t.textFaint, marginBottom: 8, fontStyle: "italic" }}>
                  Latest: {pulse.postTitle.replace(/^Issue \d+:\s*/i, "Issue 001 — ")}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {([
                  { key: "subscribers" as const, label: "Subscribers", value: pulse.subscribers,                        sub: "Beehiiv webhook → Supabase",    color: "#8B2332", clickable: true  },
                  { key: "engaged"     as const, label: "Engaged",     value: pulse.engaged,                            sub: "CRM leads warming up",          color: "#C9A24B", clickable: true  },
                  { key: "outreach"    as const, label: "In Outreach", value: pulse.outreach,                           sub: "Enrolled in Instantly sequence", color: t.accent,  clickable: true  },
                  { key: null,                   label: "Opens",       value: pulse.opens, extra: `${pulse.openRate.toFixed(0)}% · ${pulse.webViews} web`, sub: "Unique opens · Beehiiv email", color: "#7E9AA8", clickable: false },
                ] as { key: "subscribers"|"engaged"|"outreach"|null; label: string; value: number; sub: string; extra?: string; color: string; clickable: boolean }[]).map((m, i) => (
                  <div key={i} onClick={m.clickable && m.key ? () => loadDrilldown(m.key!) : undefined} style={{
                    background: m.key && drilldown === m.key ? `${m.color}18` : t.surfaceAlt,
                    border: `1px solid ${m.key && drilldown === m.key ? m.color + "55" : t.border}`,
                    borderRadius: 10, padding: "0.85rem 0.75rem",
                    cursor: m.clickable ? "pointer" : "default", transition: "all 0.15s",
                  }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: m.color, lineHeight: 1 }}>
                      {m.value.toLocaleString("en-GB")}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: t.text, marginTop: 5, fontWeight: 700 }}>{m.label}</div>
                    <div style={{ fontSize: "0.62rem", color: t.textFaint, marginTop: 2 }}>{m.sub}</div>
                    {m.extra && <div style={{ fontSize: "0.62rem", color: m.color, marginTop: 3, fontWeight: 600 }}>{m.extra}</div>}
                    {m.clickable && m.key && (
                      <div style={{ fontSize: "0.58rem", color: m.color, marginTop: 4, opacity: 0.7 }}>
                        {drilldown === m.key ? "▲ hide" : "▼ show"}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Drill-down list */}
              {drilldown && (
                <div style={{ marginTop: 12, background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden" }}>
                  {drillLoading ? (
                    <div style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: t.textMuted }}>Loading…</div>
                  ) : drillItems.length === 0 ? (
                    <div style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: t.textFaint }}>No records yet.</div>
                  ) : drillItems.map((item, i) => (
                    <div key={i} style={{
                      padding: "0.55rem 1rem",
                      borderTop: i > 0 ? `1px solid ${t.border}` : undefined,
                      display: "flex", flexDirection: "column", gap: 1,
                    }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: t.text }}>{item.label}</span>
                      {item.sub && <span style={{ fontSize: "0.68rem", color: t.textFaint }}>{item.sub}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Issues list */}
            {posts.length > 0 && (
              <div style={{ padding: "1.5rem", borderTop: `1px solid ${t.border}` }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: t.textFaint, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                  TWLR Issues
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {posts.map((post, i) => (
                    <a
                      key={post.id}
                      href={post.web_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "block",
                        padding: "0.65rem 0.75rem",
                        borderRadius: 10,
                        background: i === 0 ? t.surfaceAlt : "transparent",
                        border: `1px solid ${i === 0 ? t.border : "transparent"}`,
                        textDecoration: "none",
                        transition: "background 0.15s",
                        marginBottom: 2,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: "0.8rem", fontWeight: 600, color: t.text,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {post.title}
                          </div>
                          {post.publish_date && (
                            <div style={{ fontSize: "0.65rem", color: t.textFaint, marginTop: 1 }}>
                              {new Date(post.publish_date * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          )}
                        </div>
                        <i className="bi-box-arrow-up-right" style={{ fontSize: "0.65rem", color: t.textFaint, flexShrink: 0, marginTop: 2 }} />
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.65rem", color: t.textFaint }}>
                          <span style={{ fontWeight: 700, color: "#8B2332" }}>{post.total_sent.toLocaleString("en-GB")}</span> sent
                        </span>
                        <span style={{ fontSize: "0.65rem", color: t.textFaint }}>
                          <span style={{ fontWeight: 700, color: "#C9A24B" }}>{post.unique_opens.toLocaleString("en-GB")}</span> opens
                        </span>
                        <span style={{ fontSize: "0.65rem", color: t.textFaint }}>
                          <span style={{ fontWeight: 700, color: "#7E9AA8" }}>{post.open_rate.toFixed(0)}%</span> rate
                        </span>
                        <span style={{ fontSize: "0.65rem", color: t.textFaint }}>
                          <span style={{ fontWeight: 700, color: t.accent }}>{post.web_views.toLocaleString("en-GB")}</span> web
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Recent signals */}
            <div style={{ padding: "1.5rem", borderTop: `1px solid ${t.border}`, flex: 1 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: t.textFaint, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                Recent Signals
              </div>
              {signals.length === 0 ? (
                <div style={{ color: t.textFaint, fontSize: "0.85rem" }}>No signals yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {signals.map(s => {
                    const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || "Unknown";
                    const badge = s.guest_signup_at
                      ? { label: "Guest Signup", bg: "#E8B66A22", fg: "#8A5A00" }
                      : s.beehiiv_engaged
                      ? { label: "Newsletter", bg: "#C9A24B22", fg: "#9A7B1F" }
                      : s.linkedin_url
                      ? { label: "LinkedIn",   bg: "#0A66C222", fg: "#0A66C2" }
                      : { label: "Nurture",    bg: "#9D9BAA22", fg: "#5A5870" };
                    return (
                      <a key={s.id} href={`/leads?open=${s.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.6rem 0.75rem", background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 10, textDecoration: "none", cursor: "pointer" }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                          background: PILLAR_META["Intent/Signals"].gradient,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontWeight: 700, fontSize: "0.8rem",
                        }}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                          <div style={{ fontSize: "0.7rem", color: t.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {s.company ?? s.job_title ?? "—"}
                          </div>
                        </div>
                        <span style={{ fontSize: "0.62rem", fontWeight: 700, color: badge.fg, background: badge.bg, padding: "3px 7px", borderRadius: 6, letterSpacing: "0.04em", flexShrink: 0 }}>
                          {badge.label}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div style={{ padding: "1.25rem 1.5rem", borderTop: `1px solid ${t.border}` }}>
              <a href="/leads" style={{
                display: "block", textAlign: "center",
                background: t.accent, color: "#363541",
                borderRadius: 999, padding: "9px 14px",
                fontSize: "0.8rem", fontWeight: 700, textDecoration: "none",
                letterSpacing: "0.03em",
              }}>
                View all in Pipeline →
              </a>
            </div>
          </>
        )}
      </aside>
    </main>
  );
}
