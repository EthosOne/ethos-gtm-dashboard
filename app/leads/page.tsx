"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Contact = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  company_domain: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  city: string | null;
  country: string | null;
  stage: string;
  source: string;
  demo_scheduled: string | null;
  icp_tier: string | null;
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

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  "Demo Booked": { bg: "#E8B66A22", text: "#9A6A00" },
  "Qualified":   { bg: "#7A8A5C22", text: "#3F5030" },
  "Cold":        { bg: "#9D9BAA22", text: "#5A5870" },
  "Nurture":     { bg: "#7E9AA822", text: "#3A6070" },
  "Closed Won":  { bg: "#3F584722", text: "#2A3F30" },
  "Closed Lost": { bg: "#C1573B22", text: "#8A3A25" },
};

const ALL_STAGES = ["All", "Demo Booked", "Qualified", "Cold", "Nurture", "Closed Won", "Closed Lost"];
const PAGE_SIZE = 50;

export default function LeadsPage() {
  const [contacts, setContacts]       = useState<Contact[]>([]);
  const [total, setTotal]             = useState(0);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [stage, setStage]             = useState("All");
  const [page, setPage]               = useState(0);
  const [loading, setLoading]         = useState(true);
  const [dark, setDark]               = useState(false);
  const [search, setSearch]           = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pageInput, setPageInput]     = useState("");

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

  function applySearch() {
    setSearch(searchInput.trim());
    setPage(0);
  }

  function jumpToPage() {
    const n = parseInt(pageInput) - 1;
    if (!isNaN(n) && n >= 0 && n < totalPages) setPage(n);
    setPageInput("");
  }

  const loadContacts = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (stage !== "All") q = q.eq("stage", stage);
    if (search) {
      q = q.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%,job_title.ilike.%${search}%,country.ilike.%${search}%`
      );
    }
    const { data, count } = await q;
    if (data) setContacts(data);
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [stage, page, search]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => {
    const stages = ["Demo Booked", "Qualified", "Cold", "Nurture", "Closed Won", "Closed Lost"];
    Promise.all(
      stages.map(s =>
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("stage", s)
          .then(({ count }) => [s, count ?? 0] as [string, number])
      )
    ).then(results => {
      setStageCounts(Object.fromEntries(results));
    });
  }, []);

  const t = dark ? DARK : LIGHT;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function name(c: Contact) {
    return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
  }

  return (
    <main style={{ background: t.bg, minHeight: "100vh", padding: 0, transition: "background 0.3s" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: 12 }}>
          <div>
            <img src="/ethos-wordmark.png" alt="Ethos One"
              style={{ height: 26, marginBottom: 8, display: "block", filter: t.logoFilter, transition: "filter 0.3s" }} />
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: t.text, letterSpacing: "-0.02em" }}>
              Pipeline
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Link href="/" style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              textDecoration: "none", borderRadius: 999, padding: "6px 14px",
              fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.04em",
            }}>
              ← Home
            </Link>
            <Link href="/analytics" style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              textDecoration: "none", borderRadius: 999, padding: "6px 14px",
              fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.04em",
            }}>
              Analytics
            </Link>
            <Link href="/leads/import" style={{
              background: t.accent, color: "#fff", textDecoration: "none",
              borderRadius: 999, padding: "7px 16px", fontSize: "0.78rem",
              fontWeight: 600, letterSpacing: "0.02em", transition: "opacity 0.15s",
            }}>
              Import CSV
            </Link>
            <button onClick={toggleTheme} style={{
              background: t.toggleBg, color: t.toggleText, border: "none",
              borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem",
              fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em",
              transition: "background 0.3s, color 0.3s", fontFamily: "inherit",
            }}>
              {dark ? "☀ Light" : "◑ Dark"}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applySearch()}
            placeholder="Search by name, email, company, role, country…"
            style={{
              flex: 1, background: t.surface, border: `1px solid ${t.border}`,
              borderRadius: 8, padding: "8px 14px", fontSize: "0.83rem",
              color: t.text, outline: "none", fontFamily: "inherit",
            }}
          />
          <button onClick={applySearch} style={{
            background: t.accent, color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 18px", fontSize: "0.83rem",
            fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>Search</button>
          {search && (
            <button onClick={() => { setSearch(""); setSearchInput(""); setPage(0); }} style={{
              background: t.surface, color: t.textMuted, border: `1px solid ${t.border}`,
              borderRadius: 8, padding: "8px 14px", fontSize: "0.83rem",
              cursor: "pointer", fontFamily: "inherit",
            }}>Clear</button>
          )}
        </div>

        {/* Stage filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1.25rem" }}>
          {ALL_STAGES.map(s => {
            const count = s === "All"
              ? Object.values(stageCounts).reduce((a, b) => a + b, 0)
              : (stageCounts[s] || 0);
            const active = stage === s;
            const sc = STAGE_COLORS[s];
            return (
              <button key={s} onClick={() => { setStage(s); setPage(0); }} style={{
                background: active ? (sc?.bg ?? t.surface) : t.surface,
                border: `1px solid ${active ? (sc ? sc.text : t.text) : t.border}`,
                color: active ? (sc?.text ?? t.text) : t.textMuted,
                borderRadius: 999, padding: "5px 13px", cursor: "pointer",
                fontSize: "0.78rem", fontWeight: 600, fontFamily: "inherit",
                transition: "all 0.15s",
              }}>
                {s}{count > 0 && <span style={{ marginLeft: 5, opacity: 0.65 }}>({count.toLocaleString()})</span>}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div style={{ background: t.surface, borderRadius: 14, border: `1px solid ${t.border}`, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: t.textFaint, fontSize: "0.875rem" }}>Loading…</div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: "3.5rem", textAlign: "center" }}>
              <div style={{ color: t.textFaint, fontSize: "0.875rem", marginBottom: 12 }}>
                {stage === "All" ? "No contacts yet." : `No contacts with stage "${stage}".`}
              </div>
              {stage === "All" && (
                <Link href="/leads/import" style={{
                  background: t.accent, color: "#fff", textDecoration: "none",
                  borderRadius: 999, padding: "8px 18px", fontSize: "0.8rem", fontWeight: 600,
                }}>
                  Import CSV
                </Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: t.surfaceAlt, borderBottom: `1px solid ${t.border}` }}>
                  {["Name", "Company", "Role", "Stage", "Location", "Added"].map(col => (
                    <th key={col} style={{
                      padding: "10px 16px", textAlign: "left", fontWeight: 600,
                      color: t.textMuted, fontSize: "0.72rem", letterSpacing: "0.05em",
                      textTransform: "uppercase", whiteSpace: "nowrap",
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => {
                  const sc = STAGE_COLORS[c.stage] ?? { bg: "#9D9BAA22", text: "#5A5870" };
                  return (
                    <tr key={c.id}
                      style={{ borderBottom: i < contacts.length - 1 ? `1px solid ${t.border}` : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = t.surfaceAlt)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "11px 16px" }}>
                        <div style={{ fontWeight: 600, color: t.text, fontSize: "0.85rem" }}>{name(c)}</div>
                        {c.linkedin_url && (
                          <a href={c.linkedin_url} target="_blank" rel="noreferrer"
                            style={{ fontSize: "0.7rem", color: t.textFaint, textDecoration: "none" }}>
                            <i className="bi-linkedin" style={{ marginRight: 3 }} />LinkedIn
                          </a>
                        )}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <div style={{ color: t.text }}>{c.company ?? "—"}</div>
                        {c.company_domain && (
                          <div style={{ fontSize: "0.72rem", color: t.textFaint }}>{c.company_domain}</div>
                        )}
                      </td>
                      <td style={{ padding: "11px 16px", color: t.textMuted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.job_title ?? "—"}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <span style={{
                          background: sc.bg, color: sc.text,
                          borderRadius: 999, padding: "3px 10px",
                          fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap",
                        }}>
                          {c.stage}
                        </span>
                      </td>
                      <td style={{ padding: "11px 16px", color: t.textMuted, fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                        {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td style={{ padding: "11px 16px", color: t.textFaint, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", flexWrap: "wrap", gap: 8 }}>
            <span style={{ color: t.textFaint, fontSize: "0.78rem" }}>
              {(page * PAGE_SIZE + 1).toLocaleString()}–{Math.min((page + 1) * PAGE_SIZE, total).toLocaleString()} of {total.toLocaleString()}
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {/* Prev */}
              <button disabled={page === 0} onClick={() => setPage(0)} style={{
                background: t.surface, border: `1px solid ${t.border}`,
                color: page === 0 ? t.textFaint : t.text, borderRadius: 8,
                padding: "6px 10px", fontSize: "0.8rem", cursor: page === 0 ? "not-allowed" : "pointer", fontFamily: "inherit",
              }}>«</button>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{
                background: t.surface, border: `1px solid ${t.border}`,
                color: page === 0 ? t.textFaint : t.text, borderRadius: 8,
                padding: "6px 12px", fontSize: "0.8rem", fontWeight: 500,
                cursor: page === 0 ? "not-allowed" : "pointer", fontFamily: "inherit",
              }}>← Prev</button>

              {/* Page numbers */}
              {(() => {
                const pages: number[] = [];
                if (totalPages <= 7) {
                  for (let i = 0; i < totalPages; i++) pages.push(i);
                } else {
                  pages.push(0);
                  if (page > 2) pages.push(-1);
                  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
                  if (page < totalPages - 3) pages.push(-1);
                  pages.push(totalPages - 1);
                }
                return pages.map((p, i) => p === -1 ? (
                  <span key={`dots-${i}`} style={{ color: t.textFaint, fontSize: "0.8rem", padding: "0 2px" }}>…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)} style={{
                    background: p === page ? t.accent : t.surface,
                    border: `1px solid ${p === page ? t.accent : t.border}`,
                    color: p === page ? "#fff" : t.text,
                    borderRadius: 8, padding: "6px 11px", fontSize: "0.8rem",
                    fontWeight: p === page ? 700 : 500,
                    cursor: "pointer", fontFamily: "inherit", minWidth: 34,
                  }}>{p + 1}</button>
                ));
              })()}

              {/* Next */}
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{
                background: t.surface, border: `1px solid ${t.border}`,
                color: page >= totalPages - 1 ? t.textFaint : t.text, borderRadius: 8,
                padding: "6px 12px", fontSize: "0.8rem", fontWeight: 500,
                cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", fontFamily: "inherit",
              }}>Next →</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} style={{
                background: t.surface, border: `1px solid ${t.border}`,
                color: page >= totalPages - 1 ? t.textFaint : t.text, borderRadius: 8,
                padding: "6px 10px", fontSize: "0.8rem", cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", fontFamily: "inherit",
              }}>»</button>

              {/* Jump to page */}
              <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: 4 }}>
                <span style={{ color: t.textFaint, fontSize: "0.75rem" }}>Go to</span>
                <input
                  value={pageInput}
                  onChange={e => setPageInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && jumpToPage()}
                  placeholder="…"
                  style={{
                    width: 48, background: t.surface, border: `1px solid ${t.border}`,
                    borderRadius: 8, padding: "5px 8px", fontSize: "0.8rem",
                    color: t.text, textAlign: "center", fontFamily: "inherit", outline: "none",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: "2.5rem", paddingTop: "1.25rem", borderTop: `1px solid ${t.border}`, fontSize: "0.75rem", color: t.textFaint }}>
          Ethos One · Company OS · 2026
        </div>
      </div>
    </main>
  );
}
