"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WEBHOOK = "https://n8n-production-a158.up.railway.app/webhook/gtm-event";

const DEMO_TRIGGERS = [
  { pillar: "Operations",     status: "active",  event: "COO agent — Apple Note triaged: follow up with HR lead",          icon: "⚙️" },
  { pillar: "Content",        status: "active",  event: "Content agent — LinkedIn post drafted for Joshua",                icon: "✍️" },
  { pillar: "Intent/Signals", status: "active",  event: "Signal detected — 3 ICP profiles engaged with Joshua's post",    icon: "🎯" },
  { pillar: "Outbound",       status: "active",  event: "Outbound — 50 emails sent, 3 replies received",                  icon: "📧" },
  { pillar: "Ads",            status: "active",  event: "Ads — top post detected, ad draft ready for review",             icon: "📢" },
  { pillar: "Optimisation",   status: "active",  event: "Dashboard — all 6 systems reporting",                            icon: "📊" },
];

type Event = {
  id: number;
  pillar: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type BtnState = "idle" | "loading" | "done" | "error";

export default function TestPage() {
  const [events, setEvents]   = useState<Event[]>([]);
  const [states, setStates]   = useState<Record<string, BtnState>>({});
  const [clearing, setClearing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [log, setLog]         = useState<string[]>([]);

  useEffect(() => {
    loadEvents();
    const ch = supabase
      .channel("test-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, loadEvents)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadEvents() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setEvents(data);
  }

  function addLog(msg: string) {
    setLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev.slice(0, 19)]);
  }

  async function fireTrigger(t: typeof DEMO_TRIGGERS[0]) {
    setStates(s => ({ ...s, [t.pillar]: "loading" }));
    try {
      const res = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillar: t.pillar, status: t.status, event: t.event, is_demo: "true" }),
      });
      if (res.ok) {
        setStates(s => ({ ...s, [t.pillar]: "done" }));
        addLog(`Fired: ${t.pillar}`);
        setTimeout(() => setStates(s => ({ ...s, [t.pillar]: "idle" })), 2000);
      } else throw new Error();
    } catch {
      setStates(s => ({ ...s, [t.pillar]: "error" }));
      addLog(`Error: ${t.pillar}`);
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
    for (const t of DEMO_TRIGGERS) {
      await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillar: t.pillar, status: "pending", event: null, is_demo: "true" }),
      });
    }
    addLog("All pillars reset to PENDING");
    setResetting(false);
  }

  function btnColor(state: BtnState) {
    if (state === "done")    return { bg: "#dcfce7", border: "#86efac", color: "#166534" };
    if (state === "error")   return { bg: "#fee2e2", border: "#fca5a5", color: "#991b1b" };
    if (state === "loading") return { bg: "#f3f4f6", border: "#d1d5db", color: "#9ca3af" };
    return { bg: "#f9fafb", border: "#d1d5db", color: "#374151" };
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>

      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>Test Panel</h1>
        <p style={{ color: "#666", marginTop: 4, fontSize: "0.9rem" }}>
          Demo triggers — internal use only.{" "}
          <a href="/" style={{ color: "#2563eb" }}>← Back to dashboard</a>
        </p>
      </div>

      {/* Trigger buttons */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Demo triggers</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
          {DEMO_TRIGGERS.map(t => {
            const c = btnColor(states[t.pillar] ?? "idle");
            return (
              <div key={t.pillar} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "1rem", background: "#fff" }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.icon} {t.pillar}</div>
                <div style={{ fontSize: "0.78rem", color: "#888", marginBottom: 10 }}>{t.event}</div>
                <button
                  onClick={() => fireTrigger(t)}
                  disabled={states[t.pillar] === "loading"}
                  style={{ cursor: states[t.pillar] === "loading" ? "not-allowed" : "pointer", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: "4px 12px", fontSize: "0.82rem", fontWeight: 600, color: c.color }}
                >
                  {states[t.pillar] === "loading" ? "Firing..." : states[t.pillar] === "done" ? "Sent ✓" : states[t.pillar] === "error" ? "Error ✗" : `Fire ${t.pillar}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem" }}>
        <button
          onClick={resetAllPending}
          disabled={resetting}
          style={{ cursor: resetting ? "not-allowed" : "pointer", background: "#fef9c3", border: "1px solid #fde047", borderRadius: 6, padding: "8px 16px", fontWeight: 600, fontSize: "0.85rem", color: "#713f12" }}
        >
          {resetting ? "Resetting..." : "⟳ Reset all to PENDING"}
        </button>
        <button
          onClick={clearDemoEvents}
          disabled={clearing}
          style={{ cursor: clearing ? "not-allowed" : "pointer", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6, padding: "8px 16px", fontWeight: 600, fontSize: "0.85rem", color: "#991b1b" }}
        >
          {clearing ? "Clearing..." : "🗑 Clear demo events"}
        </button>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Activity log</h2>
          <div style={{ background: "#1e1e2e", borderRadius: 8, padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: "0.8rem" }}>
            {log.map((l, i) => (
              <div key={i} style={{ color: i === 0 ? "#a6e3a1" : "#cdd6f4", marginBottom: 2 }}>{l}</div>
            ))}
          </div>
        </div>
      )}

      {/* Events table */}
      <div>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Recent events ({events.length})</h2>
        {events.length === 0 ? (
          <p style={{ color: "#999", fontSize: "0.85rem" }}>No events yet. Fire a trigger above.</p>
        ) : (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["Pillar", "Event", "Tag", "Time"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#666", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: i < events.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>{e.pillar}</td>
                    <td style={{ padding: "8px 12px", color: "#555", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.type}</td>
                    <td style={{ padding: "8px 12px" }}>
                      {e.payload?.is_demo === "true"
                        ? <span style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 4, padding: "1px 6px", fontSize: "0.75rem", color: "#713f12" }}>demo</span>
                        : <span style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 4, padding: "1px 6px", fontSize: "0.75rem", color: "#166534" }}>real</span>
                      }
                    </td>
                    <td style={{ padding: "8px 12px", color: "#999" }}>{new Date(e.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </main>
  );
}
