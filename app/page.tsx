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

const STATUS_STYLE: Record<string, string> = {
  active:  "bg-green-100 text-green-800 border-green-300",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  error:   "bg-red-100 text-red-700 border-red-300",
};

const PILLAR_ICON: Record<string, string> = {
  "Operations":     "⚙️",
  "Content":        "✍️",
  "Intent/Signals": "🎯",
  "Outbound":       "📧",
  "Ads":            "📢",
  "Optimisation":   "📊",
};

export default function Dashboard() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("pillars")
        .select("*")
        .order("id");
      if (data) {
        setPillars(data);
        setLastRefresh(new Date().toLocaleTimeString());
      }
    }

    load();

    // realtime subscription
    const channel = supabase
      .channel("pillars-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "pillars" }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const active = pillars.filter(p => p.status === "active").length;
  const errors = pillars.filter(p => p.status === "error").length;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, margin: 0 }}>Ethos One — GTM System</h1>
          <p style={{ color: "#666", marginTop: 4 }}>Grand Workflow Dashboard</p>
        </div>
        <div style={{ textAlign: "right", fontSize: "0.85rem", color: "#999" }}>
          <div>{active}/6 active</div>
          {errors > 0 && <div style={{ color: "#dc2626" }}>{errors} error{errors > 1 ? "s" : ""}</div>}
          <div>Updated {lastRefresh}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
        {pillars.map(p => (
          <div
            key={p.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "1.2rem",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: "1.3rem" }}>{PILLAR_ICON[p.name] ?? "🔧"}</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "2px 10px",
                  borderRadius: 999,
                  border: "1px solid",
                }}
                className={STATUS_STYLE[p.status]}
              >
                {p.status.toUpperCase()}
              </span>
            </div>
            <div style={{ fontWeight: 600, fontSize: "1rem" }}>{p.name}</div>
            <div style={{ fontSize: "0.82rem", color: "#777", marginTop: 4 }}>
              {p.last_event ?? "No events yet"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#bbb", marginTop: 6 }}>
              {new Date(p.updated_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
