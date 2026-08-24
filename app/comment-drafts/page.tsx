"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CommentDraft = {
  id: string;
  founder: string;
  post_url: string;
  post_content: string | null;
  comment_id: string;
  comment_text: string;
  commenter_name: string | null;
  commenter_linkedin_url: string | null;
  commenter_position: string | null;
  comment_created_at: string | null;
  draft_reply: string | null;
  status: string;
  created_at: string;
};

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

const FOUNDER_COLORS: Record<string, string> = {
  "Josh Odigie": "#F4A988",
  "Pardeep Chera": "#7E9AA8",
  "Charlie Bloome": "#7A8A5C",
};

const TABS = ["pending", "posted", "rejected"] as const;

export default function CommentDraftsPage() {
  const [dark, setDark] = useState(false);
  const t = dark ? DARK : LIGHT;

  useEffect(() => {
    const saved = localStorage.getItem("ethos-theme");
    if (saved === "dark") setDark(true);
  }, []);

  const toggleTheme = () => {
    setDark((prev) => {
      localStorage.setItem("ethos-theme", !prev ? "dark" : "light");
      return !prev;
    });
  };

  const [drafts, setDrafts] = useState<CommentDraft[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("comment_drafts")
      .select("*")
      .eq("status", tab)
      .order("created_at", { ascending: false });
    setDrafts(data || []);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    await supabase.from("comment_drafts").update({ status }).eq("id", id);
  };

  const copyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "inherit", padding: "2rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <Link href="/" style={{ color: t.textFaint, textDecoration: "none", fontSize: "0.8rem" }}>← Company OS</Link>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.25rem 0 0" }}>Comment Drafts</h1>
            <p style={{ color: t.textMuted, fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
              Respuestas a comentarios en posts propios de Josh/Pardeep/Charlie, drafteadas en su voz. Revisá, editá si hace falta, copiá y pegá en LinkedIn.
            </p>
          </div>
          <button
            onClick={toggleTheme}
            style={{ background: t.toggleBg, color: t.toggleText, border: "none", borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em", transition: "background 0.3s, color 0.3s", fontFamily: "inherit" }}
          >
            <i className={dark ? "bi bi-sun-fill" : "bi bi-moon-fill"} style={{ marginRight: 5, color: t.toggleText }} />{dark ? "Light" : "Dark"}
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {TABS.map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              style={{
                background: tab === tb ? t.accent : "none",
                border: `1px solid ${t.border}`,
                color: tab === tb ? "#363541" : t.textMuted,
                borderRadius: 999,
                padding: "6px 16px",
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "capitalize",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {tb}
            </button>
          ))}
        </div>

        {loading && <p style={{ color: t.textFaint }}>Cargando...</p>}
        {!loading && drafts.length === 0 && (
          <p style={{ color: t.textFaint }}>Sin drafts en &quot;{tab}&quot; por ahora. El workflow corre cada 6h.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {drafts.map((d) => (
            <div key={d.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: FOUNDER_COLORS[d.founder] || t.accent, display: "inline-block" }} />
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{d.founder}</span>
                  <a href={d.post_url} target="_blank" rel="noreferrer" style={{ color: t.textFaint, fontSize: "0.75rem" }}>ver post →</a>
                </div>
                <span style={{ color: t.textFaint, fontSize: "0.72rem" }}>
                  {d.comment_created_at ? new Date(d.comment_created_at).toLocaleDateString() : ""}
                </span>
              </div>

              <div style={{ background: t.surfaceAlt, borderRadius: 10, padding: "0.75rem", marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.72rem", color: t.textFaint, marginBottom: 4 }}>
                  {d.commenter_name}{d.commenter_position ? ` · ${d.commenter_position}` : ""}
                </div>
                <div style={{ fontSize: "0.85rem" }}>{d.comment_text}</div>
              </div>

              <div style={{ fontSize: "0.72rem", color: t.textFaint, marginBottom: 4 }}>Draft de respuesta ({d.founder}):</div>
              <textarea
                value={edits[d.id] ?? d.draft_reply ?? ""}
                onChange={(e) => setEdits((prev) => ({ ...prev, [d.id]: e.target.value }))}
                rows={3}
                style={{
                  width: "100%",
                  background: t.surfaceAlt,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: "0.6rem",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />

              {tab === "pending" && (
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <button
                    onClick={() => copyText(d.id, edits[d.id] ?? d.draft_reply ?? "")}
                    style={{ background: t.accent, color: "#363541", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    {copiedId === d.id ? "Copiado ✓" : "Copiar"}
                  </button>
                  <button
                    onClick={() => updateStatus(d.id, "posted")}
                    style={{ background: "none", border: `1px solid ${t.border}`, color: t.text, borderRadius: 8, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Marcar posteado
                  </button>
                  <button
                    onClick={() => updateStatus(d.id, "rejected")}
                    style={{ background: "none", border: `1px solid ${t.border}`, color: t.textFaint, borderRadius: 8, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Descartar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
