"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LIGHT = {
  bg: "#E3E1E8", surface: "#FFFFFF", surfaceAlt: "#F5F3EF",
  border: "rgba(54,53,65,0.12)", text: "#363541", textMuted: "#4A4858",
  textFaint: "#7A7888", accent: "#F4A988",
  toggleBg: "#363541", toggleText: "#E3E1E8", logoFilter: "none",
};
const DARK = {
  bg: "#363541", surface: "#2A2935", surfaceAlt: "#1F1E2B",
  border: "rgba(227,225,232,0.08)", text: "#E3E1E8", textMuted: "#9D9BAA",
  textFaint: "#5C5A6A", accent: "#F4A988",
  toggleBg: "#E3E1E8", toggleText: "#363541", logoFilter: "brightness(0) invert(1)",
};

const LINE_COLORS = {
  twlr: "#7E9AA8",
  sme: "#C1573B",
  warm: "#7A8A5C",
  linkedin: "#E8B66A",
};

type Snapshot = {
  snapshot_date: string;
  twlr_subscribers: number;
  twlr_new: number;
  sme_sent: number;
  sme_replies: number;
  warm_sent: number;
  warm_replies: number;
  linkedin_connections: number;
  active_send_accounts: number;
  avg_bounce_rate: number;
};

function fmt(n: number) { return n.toLocaleString("en-US"); }
function fmtDate(d: string) {
  const [, m, day] = d.split("-");
  return `${m}/${day}`;
}

export default function GtmTrendsPage() {
  const [rows, setRows]     = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dark, setDark]       = useState(false);
  const [width, setWidth]     = useState(1200);

  useEffect(() => {
    setWidth(window.innerWidth);
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (localStorage.getItem("ethos-theme") === "dark") setDark(true);
  }, []);

  useEffect(() => {
    async function load() {
      const since = new Date();
      since.setDate(since.getDate() - 29);
      const { data } = await supabase
        .from("gtm_daily_snapshots")
        .select("*")
        .gte("snapshot_date", since.toISOString().slice(0, 10))
        .order("snapshot_date", { ascending: true });
      setRows((data as Snapshot[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const t = dark ? DARK : LIGHT;
  const isMobile = width < 768;

  const chartData = rows.map(r => ({
    date: fmtDate(r.snapshot_date),
    "TWLR subscribers": r.twlr_subscribers,
    "SME sent": r.sme_sent,
    "SME replies": r.sme_replies,
    "Warm sent": r.warm_sent,
    "Warm replies": r.warm_replies,
    "LinkedIn connections": r.linkedin_connections,
  }));

  const latest = rows[rows.length - 1];
  const first  = rows[0];
  const delta = (key: keyof Snapshot) =>
    latest && first ? (latest[key] as number) - (first[key] as number) : 0;

  const kpis = latest ? [
    { label: "TWLR Subscribers", value: fmt(latest.twlr_subscribers), sub: `${delta("twlr_subscribers") >= 0 ? "+" : ""}${fmt(delta("twlr_subscribers"))} in period`, color: LINE_COLORS.twlr },
    { label: "SME Emails Sent",  value: fmt(latest.sme_sent),         sub: `${latest.sme_replies} replies total`,  color: LINE_COLORS.sme },
    { label: "Warm Emails Sent", value: fmt(latest.warm_sent),        sub: `${latest.warm_replies} replies total`, color: LINE_COLORS.warm },
    { label: "LinkedIn Connections", value: fmt(latest.linkedin_connections), sub: `${latest.active_send_accounts} accounts sending`, color: LINE_COLORS.linkedin },
  ] : [];

  return (
    <main style={{ background: t.bg, minHeight: "100vh", transition: "background 0.3s", overflowX: "hidden" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-start", gap: isMobile ? 16 : 0, marginBottom: "2.5rem" }}>
          <div>
            <img src="/ethos-wordmark.png" alt="Ethos One"
              style={{ height: 28, marginBottom: 10, display: "block", filter: t.logoFilter }} />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: t.text, letterSpacing: "-0.02em" }}>
              GTM Trends
            </h1>
            <p style={{ color: t.textMuted, marginTop: 3, fontSize: "0.875rem" }}>
              Daily evolution · last 30 days · one snapshot per day
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/" style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600,
              textDecoration: "none", letterSpacing: "0.04em",
            }}>← Home</Link>
            <Link href="/analytics" style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600,
              textDecoration: "none", letterSpacing: "0.04em",
            }}>Pipeline Analytics →</Link>
          </div>
        </div>

        {loading ? (
          <p style={{ color: t.textMuted }}>Loading…</p>
        ) : rows.length === 0 ? (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "2rem", color: t.textMuted }}>
            No snapshots yet — the daily cron writes the first one at 6am UTC. Check back tomorrow.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: "2rem" }}>
              {kpis.map(k => (
                <div key={k.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.1rem" }}>
                  <div style={{ fontSize: "0.72rem", color: t.textFaint, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{k.label}</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 700, color: t.text, marginTop: 4 }}>{k.value}</div>
                  <div style={{ fontSize: "0.78rem", color: k.color, marginTop: 2, fontWeight: 600 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: t.text }}>TWLR Subscribers</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                  <XAxis dataKey="date" tick={{ fill: t.textMuted, fontSize: 11 }} />
                  <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="TWLR subscribers" stroke={LINE_COLORS.twlr} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: t.text }}>Cold Outbound — Sent</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                  <XAxis dataKey="date" tick={{ fill: t.textMuted, fontSize: 11 }} />
                  <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="SME sent" stroke={LINE_COLORS.sme} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Warm sent" stroke={LINE_COLORS.warm} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: t.text }}>LinkedIn Connections</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                  <XAxis dataKey="date" tick={{ fill: t.textMuted, fontSize: 11 }} />
                  <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="LinkedIn connections" stroke={LINE_COLORS.linkedin} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
