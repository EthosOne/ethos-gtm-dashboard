"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
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

const STAGES = ["Cold", "Nurture", "Qualified", "Demo Booked", "Closed Won", "Closed Lost"];

const STAGE_COLOR: Record<string, string> = {
  "Cold":        "#9D9BAA",
  "Nurture":     "#7E9AA8",
  "Qualified":   "#7A8A5C",
  "Demo Booked": "#E8B66A",
  "Closed Won":  "#3F5847",
  "Closed Lost": "#C1573B",
};

function fmt(n: number) { return n.toLocaleString("en-US"); }

export default function AnalyticsPage() {
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [dark, setDark]               = useState(false);
  const [width, setWidth]             = useState(1200);
  const [twlrCount, setTwlrCount]     = useState(0);
  const [engagedCount, setEngagedCount] = useState(0);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [signalDays, setSignalDays]   = useState<{ date: string; count: number }[]>([]);
  const [nlStats, setNlStats]         = useState<{ unique_opens: number; open_rate: number; web_views: number; total_sent: number; post_title: string }>({ unique_opens: 0, open_rate: 0, web_views: 0, total_sent: 0, post_title: "" });

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
      const { count: tot } = await supabase
        .from("contacts").select("*", { count: "exact", head: true });
      setTotal(tot ?? 0);

      const counts: Record<string, number> = {};
      await Promise.all(STAGES.map(async s => {
        const { count } = await supabase
          .from("contacts").select("*", { count: "exact", head: true }).eq("stage", s);
        counts[s] = count ?? 0;
      }));
      setStageCounts(counts);

      const { count: twlr } = await supabase
        .from("twlr_subscribers").select("*", { count: "exact", head: true });
      setTwlrCount(twlr ?? 0);

      const { count: bEngaged } = await supabase
        .from("contacts").select("*", { count: "exact", head: true }).eq("beehiiv_engaged", true);
      setEngagedCount(bEngaged ?? 0);

      const { count: enrolled } = await supabase
        .from("contacts").select("*", { count: "exact", head: true }).eq("instantly_enrolled", true);
      setEnrolledCount(enrolled ?? 0);

      const nlRes = await fetch("/api/newsletter-stats").then(r => r.json()).catch(() => ({}));
      setNlStats({
        unique_opens: nlRes.unique_opens ?? 0,
        open_rate:    nlRes.open_rate    ?? 0,
        web_views:    nlRes.web_views    ?? 0,
        total_sent:   nlRes.total_sent   ?? 0,
        post_title:   nlRes.post_title   ?? "",
      });

      const since = new Date();
      since.setDate(since.getDate() - 6);
      const { data: signals } = await supabase
        .from("contacts")
        .select("last_event_at")
        .eq("beehiiv_engaged", true)
        .gte("last_event_at", since.toISOString());
      const dayMap: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        dayMap[d.toISOString().slice(0, 10)] = 0;
      }
      (signals ?? []).forEach(r => {
        if (r.last_event_at) {
          const day = (r.last_event_at as string).slice(0, 10);
          if (day in dayMap) dayMap[day]++;
        }
      });
      setSignalDays(Object.entries(dayMap).map(([date, count]) => ({ date: date.slice(5), count })));

      setLoading(false);
    }
    load();
  }, []);

  const t = dark ? DARK : LIGHT;
  const isMobile = width < 768;

  const barData = STAGES.map(s => ({ stage: s, count: stageCounts[s] ?? 0 }));

  const pieData = STAGES
    .filter(s => (stageCounts[s] ?? 0) > 0)
    .map(s => ({ name: s, value: stageCounts[s] ?? 0 }));

  const demoBooked   = stageCounts["Demo Booked"] ?? 0;
  const closedWon    = stageCounts["Closed Won"]  ?? 0;
  const qualified    = stageCounts["Qualified"]   ?? 0;
  const engaged      = qualified + demoBooked + closedWon;
  const engageRate   = total > 0 ? (engaged / total * 100).toFixed(1) : "—";
  const bookedRate   = total > 0 ? (demoBooked / total * 100).toFixed(1) : "—";
  const wonRate      = total > 0 ? (closedWon  / total * 100).toFixed(1) : "—";

  const kpis = [
    { label: "Total Leads",  value: fmt(total),         sub: "in pipeline",                              hint: "",                                          color: t.accent  },
    { label: "Engaged",      value: `${engageRate}%`,   sub: `${fmt(engaged)} contacts`,                 hint: "Qualified + Demo Booked + Closed Won",      color: "#7A8A5C" },
    { label: "Demo Booked",  value: `${bookedRate}%`,   sub: `${fmt(demoBooked)} contacts`,              hint: "% of total pipeline that booked a demo",    color: "#E8B66A" },
    { label: "Closed Won",   value: `${wonRate}%`,      sub: `${fmt(closedWon)} contacts`,               hint: "% of total pipeline converted to clients",  color: "#3F5847" },
  ];

  return (
    <main style={{ background: t.bg, minHeight: "100vh", transition: "background 0.3s", overflowX: "hidden" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-start", gap: isMobile ? 16 : 0, marginBottom: "2.5rem" }}>
          <div>
            <img src="/ethos-wordmark.png" alt="Ethos One"
              style={{ height: 28, marginBottom: 10, display: "block", filter: t.logoFilter }} />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: t.text, letterSpacing: "-0.02em" }}>
              Pipeline Analytics
            </h1>
            <p style={{ color: t.textMuted, marginTop: 3, fontSize: "0.875rem" }}>
              Lead counts · Stage breakdown · Conversion rates
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/" style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600,
              textDecoration: "none", letterSpacing: "0.04em",
            }}>← Home</Link>
            <Link href="/kanban" style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600,
              textDecoration: "none", letterSpacing: "0.04em",
            }}>Kanban</Link>
            <Link href="/leads" style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600,
              textDecoration: "none", letterSpacing: "0.04em",
            }}>Pipeline →</Link>
            <button onClick={() => setDark(d => !d)} style={{
              background: t.toggleBg, color: t.toggleText, border: "none",
              borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem",
              fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em", fontFamily: "inherit",
            }}>
              <i className={dark ? "bi bi-sun-fill" : "bi bi-moon-fill"} style={{ marginRight: 5, color: t.toggleText }} />{dark ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: t.border, marginBottom: "2rem" }} />

        {loading ? (
          <div style={{ color: t.textMuted, fontSize: "0.9rem", padding: "2rem 0" }}>Loading…</div>
        ) : (
          <>
            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              {kpis.map(k => (
                <div key={k.label} style={{
                  background: t.surface, border: `1px solid ${t.border}`,
                  borderRadius: 14, padding: "1.25rem",
                }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: t.textFaint, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                    {k.label}
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: k.color, letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {k.value}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: t.textMuted, marginTop: 6 }}>
                    {k.sub}
                  </div>
                  {k.hint && (
                    <div style={{ fontSize: "0.68rem", color: t.textFaint, marginTop: 4, fontStyle: "italic" }}>
                      {k.hint}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 380px", gap: "1rem", marginBottom: "2rem" }}>

              {/* Bar chart */}
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.5rem", overflow: "hidden" }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: t.text, marginBottom: "1.25rem" }}>
                  Leads by Stage
                </div>
                <div style={{ overflowX: "auto", width: "100%" }}>
                  <BarChart width={480} height={260} data={barData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <XAxis
                      dataKey="stage"
                      tick={{ fontSize: 10, fill: t.textMuted }}
                      tickLine={false}
                      axisLine={false}
                      angle={-25}
                      textAnchor="end"
                      height={50}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: t.textFaint }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        background: t.surface, border: `1px solid ${t.border}`,
                        borderRadius: 8, fontSize: 12, color: t.text,
                      }}
                      cursor={{ fill: t.border }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {barData.map(entry => (
                        <Cell key={entry.stage} fill={STAGE_COLOR[entry.stage]} />
                      ))}
                    </Bar>
                  </BarChart>
                </div>
              </div>

              {/* Pie chart */}
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.5rem", overflow: "hidden" }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: t.text, marginBottom: "1.25rem" }}>
                  Stage Distribution
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {pieData.map(entry => (
                        <Cell key={entry.name} fill={STAGE_COLOR[entry.name]} />
                      ))}
                    </Pie>
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, color: t.textMuted }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: t.surface, border: `1px solid ${t.border}`,
                        borderRadius: 8, fontSize: 12, color: t.text,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stage table */}
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${t.border}` }}>
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: t.text }}>Stage Breakdown</span>
              </div>
              <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: t.surfaceAlt }}>
                    {["Stage", "Count", "% of Total", "Bar"].map(h => (
                      <th key={h} style={{
                        padding: "0.65rem 1.5rem", textAlign: "left",
                        fontWeight: 600, fontSize: "0.75rem", color: t.textFaint,
                        letterSpacing: "0.06em", textTransform: "uppercase",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STAGES.map((s, i) => {
                    const cnt = stageCounts[s] ?? 0;
                    const pct = total > 0 ? (cnt / total * 100) : 0;
                    return (
                      <tr key={s} style={{ borderTop: i > 0 ? `1px solid ${t.border}` : undefined }}>
                        <td style={{ padding: "0.75rem 1.5rem", color: t.text, fontWeight: 600 }}>
                          <span style={{
                            display: "inline-block", width: 8, height: 8,
                            borderRadius: "50%", background: STAGE_COLOR[s],
                            marginRight: 8, verticalAlign: "middle",
                          }} />
                          {s}
                        </td>
                        <td style={{ padding: "0.75rem 1.5rem", color: t.textMuted, fontWeight: 600 }}>
                          {fmt(cnt)}
                        </td>
                        <td style={{ padding: "0.75rem 1.5rem", color: t.textFaint }}>
                          {pct.toFixed(1)}%
                        </td>
                        <td style={{ padding: "0.75rem 1.5rem", width: "30%" }}>
                          <div style={{ background: t.border, borderRadius: 4, height: 6, overflow: "hidden" }}>
                            <div style={{
                              width: `${pct}%`, height: "100%",
                              background: STAGE_COLOR[s], borderRadius: 4,
                              transition: "width 0.6s ease",
                            }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>

            {/* Newsletter Signal section */}
            <div style={{ height: 1, background: t.border, margin: "2rem 0" }} />

            <div style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: t.text, margin: 0, letterSpacing: "-0.01em" }}>
                Newsletter Signal · TWLR
              </h2>
              <p style={{ color: t.textMuted, marginTop: 3, fontSize: "0.8rem" }}>
                Subscriber reach · Engagement · Outreach pipeline
              </p>
            </div>

            {/* Latest issue stats */}
            {nlStats.post_title && (
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: t.textFaint, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                  Latest Issue
                </div>
                <div style={{ fontSize: "0.82rem", color: t.textMuted, marginBottom: 12, fontStyle: "italic" }}>
                  {nlStats.post_title}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  {[
                    { label: "Sent",      value: fmt(nlStats.total_sent),                        color: "#8B2332" },
                    { label: "Opens",     value: fmt(nlStats.unique_opens),                      color: "#C9A24B" },
                    { label: "Open Rate", value: `${nlStats.open_rate.toFixed(0)}%`,             color: "#7E9AA8" },
                    { label: "Web Views", value: fmt(nlStats.web_views),                         color: t.accent  },
                  ].map(k => (
                    <div key={k.label} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 12, padding: "0.9rem 1rem" }}>
                      <div style={{ fontSize: "0.68rem", fontWeight: 600, color: t.textFaint, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{k.label}</div>
                      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { label: "TWLR Subscribers", value: fmt(twlrCount),      sub: "signed up via newsletter",        color: "#8B2332" },
                { label: "Newsletter Engaged", value: fmt(engagedCount),  sub: "opened or clicked an email",      color: "#C9A24B" },
                { label: "Engagement Rate",    value: twlrCount > 0 ? `${(engagedCount / twlrCount * 100).toFixed(1)}%` : "—", sub: "of TWLR subscribers engaged", color: "#7A8A5C" },
                { label: "In Outreach",        value: fmt(enrolledCount), sub: "enrolled in Instantly sequence",  color: t.accent },
              ].map(k => (
                <div key={k.label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.25rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: t.textFaint, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                    {k.label}
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: k.color, letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {k.value}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: t.textMuted, marginTop: 6 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.5rem", overflow: "hidden" }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: t.text, marginBottom: "1.25rem" }}>
                Engagement Signals — Last 7 Days
              </div>
              {signalDays.every(d => d.count === 0) ? (
                <div style={{ color: t.textFaint, fontSize: "0.85rem", padding: "1rem 0" }}>
                  No engagement signals in the last 7 days yet.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <BarChart width={isMobile ? 320 : 640} height={180} data={signalDays} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: t.textMuted }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: t.textFaint }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12, color: t.text }} cursor={{ fill: t.border }} />
                    <Bar dataKey="count" fill="#C9A24B" radius={[6, 6, 0, 0]} name="Signals" />
                  </BarChart>
                </div>
              )}
            </div>

          </>
        )}

        {/* Footer */}
        <div style={{
          marginTop: "3rem", paddingTop: "1.5rem", borderTop: `1px solid ${t.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: "0.75rem", color: t.textFaint,
        }}>
          <span>Ethos One · Pipeline Analytics · 2026</span>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", background: "#7A8A5C",
            display: "inline-block", boxShadow: "0 0 6px #7A8A5C",
          }} title="Live data" />
        </div>
      </div>
    </main>
  );
}
