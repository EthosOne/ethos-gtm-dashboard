"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WEBHOOK = "https://n8n.tryethosone.com/webhook/gtm-event";

const DEMO_TRIGGERS = [
  { pillar: "Operations",     status: "active", event: "COO agent — Apple Note triaged: follow up with HR lead",       icon: "bi-gear-fill" },
  { pillar: "Content",        status: "active", event: "Content agent — LinkedIn post drafted for Joshua",              icon: "bi-pencil-square" },
  { pillar: "Intent/Signals", status: "active", event: "Signal detected — 3 ICP profiles engaged with Joshua's post",  icon: "bi-broadcast" },
  { pillar: "Outbound",       status: "active", event: "Outbound — 50 emails sent, 3 replies received",                icon: "bi-envelope-fill" },
  { pillar: "Ads",            status: "active", event: "Ads — top post detected, ad draft ready for review",           icon: "bi-megaphone-fill" },
  { pillar: "Optimisation",   status: "active", event: "Dashboard — all 6 systems reporting",                          icon: "bi-graph-up" },
];

type Event = { id: number; pillar: string; type: string; payload: Record<string, unknown>; created_at: string };
type BtnState = "idle" | "loading" | "done" | "error";

const LIGHT = { bg: "#E3E1E8", surface: "#FFFFFF", surfaceAlt: "#F5F3EF", border: "rgba(54,53,65,0.12)", text: "#363541", textMuted: "#4A4858", textFaint: "#7A7888", toggleBg: "#363541", toggleText: "#FFFFFF" };
const DARK  = { bg: "#1a1c24", surface: "#252730", surfaceAlt: "#1e2028", border: "rgba(255,255,255,0.08)", text: "#E3E1E8", textMuted: "#B0AEBE", textFaint: "#7A7888", toggleBg: "#E3E1E8", toggleText: "#363541" };

export default function TestPage() {
  const [dark, setDark] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [states, setStates] = useState<Record<string, BtnState>>({});
  const [clearing, setClearing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const t = dark ? DARK : LIGHT;

  useEffect(() => {
    const saved = localStorage.getItem("ethos-theme");
    if (saved === "dark") setDark(true);
  }, []);

  function toggleTheme() {
    setDark(d => { localStorage.setItem("ethos-theme", !d ? "dark" : "light"); return !d; });
  }

  useEffect(() => {
    loadEvents();
    const ch = supabase
      .channel("test-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, loadEvents)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadEvents() {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false }).limit(20);
    if (data) setEvents(data);
  }

  function addLog(msg: string) {
    setLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev.slice(0, 19)]);
  }

  async function fireTrigger(trigger: typeof DEMO_TRIGGERS[0]) {
    setStates(s => ({ ...s, [trigger.pillar]: "loading" }));
    try {
      const res = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillar: trigger.pillar, status: trigger.status, event: trigger.event, is_demo: "true" }),
      });
      if (res.ok) {
        setStates(s => ({ ...s, [trigger.pillar]: "done" }));
        addLog(`Fired: ${trigger.pillar}`);
        setTimeout(() => setStates(s => ({ ...s, [trigger.pillar]: "idle" })), 2000);
      } else throw new Error();
    } catch {
      setStates(s => ({ ...s, [trigger.pillar]: "error" }));
      addLog(`Error: ${trigger.pillar}`);
    }
  }

  async function clearDemoEvents() {
    setClearing(true);
    await supabase.from("events").delete().filter("payload->>is_demo", "eq", "true");
    addLog("Demo events cleared");
    await loadEvents();
    setClearing(false);
  }

  async function resetAllPending() {
    setResetting(true);
    addLog("Resetting all pillars to PENDING...");
    for (const trigger of DEMO_TRIGGERS) {
      await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillar: trigger.pillar, status: "pending", event: null, is_demo: "true" }),
      });
    }
    addLog("All pillars reset to PENDING");
    setResetting(false);
  }

  function btnState(state: BtnState) {
    if (state === "done")    return { bg: "#dcfce7", border: "#86efac", color: "#166534", icon: "bi-check", label: "Sent" };
    if (state === "error")   return { bg: "#fee2e2", border: "#fca5a5", color: "#991b1b", icon: "bi-x-circle", label: "Error" };
    if (state === "loading") return { bg: t.surfaceAlt, border: t.border, color: t.textFaint, icon: "bi-hourglass-split", label: "Firing…" };
    return { bg: t.surfaceAlt, border: t.border, color: t.textMuted, icon: "bi-lightning-fill", label: "" };
  }

  return (
    <main style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif", background: t.bg, minHeight: "100vh", padding: "2rem 1rem", transition: "background 0.3s", overflowX: "hidden" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: t.text }}>Test Panel</h1>
            <p style={{ color: t.textFaint, marginTop: 4, fontSize: "0.9rem" }}>
              Demo triggers — internal use only.{" "}
              <a href="/" style={{ color: t.textMuted }}>← Dashboard</a>
            </p>
          </div>
          <button onClick={toggleTheme} style={{ background: t.toggleBg, color: t.toggleText, border: "none", borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <i className={dark ? "bi bi-sun" : "bi bi-moon-half"} style={{ marginRight: 5 }} />{dark ? "Light" : "Dark"}
          </button>
        </div>

        {/* Trigger buttons */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: t.text }}>Demo triggers</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
            {DEMO_TRIGGERS.map(trigger => {
              const state = states[trigger.pillar] ?? "idle";
              const b = btnState(state);
              return (
                <div key={trigger.pillar} style={{ border: `1px solid ${t.border}`, borderRadius: 10, padding: "1rem", background: t.surface }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, color: t.text }}>
                    <i className={`bi ${trigger.icon}`} style={{ marginRight: 7, color: t.textFaint }} />{trigger.pillar}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: t.textFaint, marginBottom: 10 }}>{trigger.event}</div>
                  <button
                    onClick={() => fireTrigger(trigger)}
                    disabled={state === "loading"}
                    style={{ cursor: state === "loading" ? "not-allowed" : "pointer", background: b.bg, border: `1px solid ${b.border}`, borderRadius: 6, padding: "4px 12px", fontSize: "0.82rem", fontWeight: 600, color: b.color, fontFamily: "inherit" }}
                  >
                    <i className={`bi ${b.icon}`} style={{ marginRight: 5 }} />
                    {b.label || `Fire ${trigger.pillar}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          <button onClick={resetAllPending} disabled={resetting} style={{ cursor: resetting ? "not-allowed" : "pointer", background: "#fef9c3", border: "1px solid #fde047", borderRadius: 6, padding: "8px 16px", fontWeight: 600, fontSize: "0.85rem", color: "#713f12", fontFamily: "inherit" }}>
            <i className="bi bi-arrow-clockwise" style={{ marginRight: 6 }} />{resetting ? "Resetting…" : "Reset all to PENDING"}
          </button>
          <button onClick={clearDemoEvents} disabled={clearing} style={{ cursor: clearing ? "not-allowed" : "pointer", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6, padding: "8px 16px", fontWeight: 600, fontSize: "0.85rem", color: "#991b1b", fontFamily: "inherit" }}>
            <i className="bi bi-trash" style={{ marginRight: 6 }} />{clearing ? "Clearing…" : "Clear demo events"}
          </button>
        </div>

        {/* Log */}
        {log.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: t.text }}>Activity log</h2>
            <div style={{ background: "#1e1e2e", borderRadius: 8, padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: "0.8rem" }}>
              {log.map((l, i) => (
                <div key={i} style={{ color: i === 0 ? "#a6e3a1" : "#cdd6f4", marginBottom: 2 }}>{l}</div>
              ))}
            </div>
          </div>
        )}

        {/* Events table */}
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: t.text }}>Recent events ({events.length})</h2>
          {events.length === 0 ? (
            <p style={{ color: t.textFaint, fontSize: "0.85rem" }}>No events yet. Fire a trigger above.</p>
          ) : (
            <div style={{ border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: t.surfaceAlt, borderBottom: `1px solid ${t.border}` }}>
                    {["Pillar", "Event", "Tag", "Time"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: t.textFaint, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={e.id} style={{ borderBottom: i < events.length - 1 ? `1px solid ${t.border}` : "none", background: t.surface }}>
                      <td style={{ padding: "8px 12px", fontWeight: 500, color: t.text }}>{e.pillar}</td>
                      <td style={{ padding: "8px 12px", color: t.textMuted, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.type}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {e.payload?.is_demo === "true"
                          ? <span style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 4, padding: "1px 6px", fontSize: "0.75rem", color: "#713f12" }}>demo</span>
                          : <span style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 4, padding: "1px 6px", fontSize: "0.75rem", color: "#166534" }}>real</span>
                        }
                      </td>
                      <td style={{ padding: "8px 12px", color: t.textFaint }}>{new Date(e.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
