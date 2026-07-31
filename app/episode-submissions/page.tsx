"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LIGHT = {
  bg: "#E3E1E8", surface: "#FFFFFF", surfaceAlt: "#F5F3EF",
  border: "rgba(54,53,65,0.12)", text: "#363541", textMuted: "#4A4858",
  textFaint: "#7A7888", accent: "#C9A24B",
  toggleBg: "#363541", toggleText: "#E3E1E8", logoFilter: "none",
};
const DARK = {
  bg: "#363541", surface: "#2A2935", surfaceAlt: "#1F1E2B",
  border: "rgba(227,225,232,0.08)", text: "#E3E1E8", textMuted: "#9D9BAA",
  textFaint: "#5C5A6A", accent: "#C9A24B",
  toggleBg: "#E3E1E8", toggleText: "#363541", logoFilter: "brightness(0) invert(1)",
};

type Submission = {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  company_name: string | null;
  phone: string | null;
  email: string;
  linkedin_url: string | null;
  episode_topic: string | null;
  description_notes: string | null;
  interactive_elements: string | null;
  quote_testimonial: string | null;
};

type ContactReminders = {
  id: number;
  email: string;
  reminder_thankyou_sent_at: string | null;
  reminder_offer_sent_at: string | null;
  reminder_bigco_sent_at: string | null;
};

const REMINDER_STEPS: { field: keyof ContactReminders; label: string }[] = [
  { field: "reminder_thankyou_sent_at", label: "1. Thank-you + stats sent" },
  { field: "reminder_offer_sent_at", label: "2. Ethos One offer sent" },
  { field: "reminder_bigco_sent_at", label: "3. Big-company soft approach sent" },
];

export default function EpisodeSubmissions() {
  const [dark, setDark] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reminders, setReminders] = useState<Record<string, ContactReminders>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ethos-theme");
    if (saved === "dark") setDark(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: subs } = await supabase
      .from("episode_builder")
      .select("*")
      .order("created_at", { ascending: false });
    setSubmissions(subs ?? []);

    if (subs && subs.length > 0) {
      const emails = subs.map(s => s.email);
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, email, reminder_thankyou_sent_at, reminder_offer_sent_at, reminder_bigco_sent_at")
        .in("email", emails);
      const byEmail: Record<string, ContactReminders> = {};
      (contacts ?? []).forEach(c => { byEmail[c.email] = c as ContactReminders; });
      setReminders(byEmail);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleTheme() {
    setDark(prev => {
      localStorage.setItem("ethos-theme", !prev ? "dark" : "light");
      return !prev;
    });
  }

  async function toggleReminder(email: string, field: keyof ContactReminders) {
    const contact = reminders[email];
    if (!contact) return;
    const key = `${email}-${field}`;
    setUpdating(key);
    const newValue = !contact[field];
    setReminders(prev => ({ ...prev, [email]: { ...prev[email], [field]: newValue ? new Date().toISOString() : null } }));
    await fetch("/api/leads/update-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contact.id, field, value: newValue }),
    });
    setUpdating(null);
  }

  const t = dark ? DARK : LIGHT;

  return (
    <main style={{ background: t.bg, minHeight: "100vh", padding: 0 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: 12 }}>
          <div>
            <img src="/ethos-wordmark.png" alt="Ethos One"
              style={{ height: 26, marginBottom: 8, display: "block", filter: t.logoFilter }} />
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: t.text, letterSpacing: "-0.02em" }}>
              Episode Submissions
            </h1>
            <p style={{ fontSize: "0.78rem", color: t.textFaint, marginTop: 4 }}>
              What guests submitted via the Episode Builder form, plus manual reminder tracking.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Link href="/leads" style={{ background: "none", border: `1px solid ${t.border}`, color: t.textMuted, textDecoration: "none", borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600 }}>← Leads</Link>
            <Link href="/" style={{ background: "none", border: `1px solid ${t.border}`, color: t.textMuted, textDecoration: "none", borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600 }}>Home</Link>
            <button onClick={toggleTheme} style={{ background: t.toggleBg, color: t.toggleText, border: "none", borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
              {dark ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        {loading && <div style={{ color: t.textFaint, fontSize: "0.85rem" }}>Loading…</div>}

        {!loading && submissions.length === 0 && (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "2rem", textAlign: "center", color: t.textFaint, fontSize: "0.85rem" }}>
            No submissions yet.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {submissions.map(s => {
            const c = reminders[s.email];
            return (
              <div key={s.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "1.25rem 1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: t.text }}>
                      {[s.first_name, s.last_name].filter(Boolean).join(" ") || s.email}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: t.textFaint, marginTop: 2 }}>
                      {[s.job_title, s.company_name].filter(Boolean).join(" · ")}
                      {s.job_title || s.company_name ? " · " : ""}{s.email}
                      {s.phone ? ` · ${s.phone}` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: t.textFaint, whiteSpace: "nowrap" }}>
                    {new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {s.episode_topic && (
                    <div><b style={{ fontSize: "0.72rem", color: t.textFaint }}>Topic:</b> <span style={{ fontSize: "0.82rem", color: t.text }}>{s.episode_topic}</span></div>
                  )}
                  {s.description_notes && (
                    <div><b style={{ fontSize: "0.72rem", color: t.textFaint }}>Description:</b> <span style={{ fontSize: "0.82rem", color: t.text }}>{s.description_notes}</span></div>
                  )}
                  {s.interactive_elements && (
                    <div><b style={{ fontSize: "0.72rem", color: t.textFaint }}>Interactive:</b> <span style={{ fontSize: "0.82rem", color: t.text }}>{s.interactive_elements}</span></div>
                  )}
                  {s.quote_testimonial && (
                    <div><b style={{ fontSize: "0.72rem", color: t.textFaint }}>Quote:</b> <span style={{ fontSize: "0.82rem", color: t.text, fontStyle: "italic" }}>&ldquo;{s.quote_testimonial}&rdquo;</span></div>
                  )}
                  {s.linkedin_url && (
                    <div><b style={{ fontSize: "0.72rem", color: t.textFaint }}>LinkedIn:</b> <a href={s.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.82rem", color: t.accent }}>{s.linkedin_url}</a></div>
                  )}
                </div>

                {c && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${t.border}`, display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {REMINDER_STEPS.map(step => {
                      const sentAt = c[step.field] as string | null;
                      const sent = !!sentAt;
                      const key = `${s.email}-${step.field}`;
                      return (
                        <label key={step.field} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", opacity: updating === key ? 0.5 : 1 }}>
                          <input
                            type="checkbox"
                            checked={sent}
                            onChange={() => toggleReminder(s.email, step.field)}
                            disabled={updating === key}
                          />
                          <span style={{ fontSize: "0.75rem", color: sent ? t.text : t.textFaint }}>
                            {step.label}
                            {sent && (
                              <span style={{ color: t.textFaint }}>
                                {" — "}
                                {new Date(sentAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
