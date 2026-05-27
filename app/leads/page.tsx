"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import ContactDrawer, { Contact as DrawerContact } from "../components/ContactDrawer";

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
  twlr_subscriber: boolean | null;
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
  const [twlrCount, setTwlrCount]     = useState(0);
  const [stage, setStage]             = useState("All");
  const [page, setPage]               = useState(0);
  const [loading, setLoading]         = useState(true);
  const [dark, setDark]               = useState(false);
  const [search, setSearch]           = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pageInput, setPageInput]     = useState("");
  const [updatingId, setUpdatingId]     = useState<number | null>(null);
  const [savedId, setSavedId]           = useState<number | null>(null);
  const [twlrOnly, setTwlrOnly]         = useState(false);
  const [twlrUpdating, setTwlrUpdating] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });
  const [drawerContact, setDrawerContact] = useState<DrawerContact | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerNew, setDrawerNew] = useState(false);

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

  async function updateTwlr(id: number, value: boolean) {
    setTwlrUpdating(id);
    setContacts(prev => prev.map(c => c.id === id ? { ...c, twlr_subscriber: value } : c));
    setTwlrCount(prev => Math.max(0, prev + (value ? 1 : -1)));
    await fetch("/api/leads/update-twlr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, twlr_subscriber: value }),
    });
    setTwlrUpdating(null);
  }

  async function updateStage(id: number, newStage: string) {
    const oldStage = contacts.find(c => c.id === id)?.stage;
    setUpdatingId(id);
    setContacts(prev => prev.map(c => c.id === id ? { ...c, stage: newStage } : c));
    const res = await fetch("/api/leads/update-stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stage: newStage }),
    });
    if (res.ok) {
      if (oldStage && oldStage !== newStage) {
        setStageCounts(prev => ({
          ...prev,
          [oldStage]: Math.max(0, (prev[oldStage] ?? 0) - 1),
          [newStage]: (prev[newStage] ?? 0) + 1,
        }));
      }
      setSavedId(id);
      setTimeout(() => setSavedId(null), 1500);
    } else {
      loadContacts();
    }
    setUpdatingId(null);
  }

  const loadContacts = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (stage !== "All") q = q.eq("stage", stage);
    if (twlrOnly) q = q.eq("twlr_subscriber", true);
    if (search) {
      q = q.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%,job_title.ilike.%${search}%,country.ilike.%${search}%`
      );
    }
    const { data, count } = await q;
    if (data) setContacts(data);
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [stage, page, search, twlrOnly]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => {
    const stages = ["Demo Booked", "Qualified", "Cold", "Nurture", "Closed Won", "Closed Lost"];
    Promise.all(
      stages.map(s =>
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("stage", s)
          .then(({ count }) => [s, count ?? 0] as [string, number])
      )
    ).then(results => setStageCounts(Object.fromEntries(results)));

    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("twlr_subscriber", true)
      .then(({ count }) => setTwlrCount(count ?? 0));
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
            <Link href="/kanban" style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              textDecoration: "none", borderRadius: 999, padding: "6px 14px",
              fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.04em",
            }}>
              Kanban
            </Link>
            <Link href="/analytics" style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              textDecoration: "none", borderRadius: 999, padding: "6px 14px",
              fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.04em",
            }}>
              Analytics
            </Link>
            <button onClick={() => { setDrawerNew(true); setDrawerContact(null); setDrawerOpen(true); }} style={{
              background: t.accent, color: "#fff", border: "none",
              borderRadius: 999, padding: "7px 16px", fontSize: "0.78rem",
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>+ New Contact</button>
            <Link href="/leads/import" style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              textDecoration: "none", borderRadius: 999, padding: "7px 16px",
              fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.02em",
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
              <button key={s} onClick={() => { setStage(s); setTwlrOnly(false); setPage(0); }} style={{
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
          {/* TWLR filter — mutually exclusive with stage */}
          <button onClick={() => { setTwlrOnly(v => !v); setStage("All"); setPage(0); }} style={{
            background: twlrOnly ? "#F4A98822" : t.surface,
            border: `1px solid ${twlrOnly ? "#F4A98866" : t.border}`,
            color: twlrOnly ? "#C1573B" : t.textMuted,
            borderRadius: 999, padding: "5px 13px", cursor: "pointer",
            fontSize: "0.78rem", fontWeight: 700, fontFamily: "inherit",
            letterSpacing: "0.03em", transition: "all 0.15s",
          }}>
            TWLR{(() => { const n = twlrOnly ? total : twlrCount; return n > 0 ? <span style={{ marginLeft: 5, opacity: 0.65 }}>({n.toLocaleString()})</span> : null; })()}{twlrOnly && " ✓"}
          </button>
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
            <div
              ref={tableRef}
              style={{ overflowX: "auto", cursor: isDragging.current ? "grabbing" : "grab" }}
              onMouseDown={e => {
                if (!tableRef.current) return;
                isDragging.current = true;
                dragStart.current = { x: e.clientX, scrollLeft: tableRef.current.scrollLeft };
                tableRef.current.style.cursor = "grabbing";
              }}
              onMouseMove={e => {
                if (!isDragging.current || !tableRef.current) return;
                tableRef.current.scrollLeft = dragStart.current.scrollLeft - (e.clientX - dragStart.current.x);
              }}
              onMouseUp={() => { isDragging.current = false; if (tableRef.current) tableRef.current.style.cursor = "grab"; }}
              onMouseLeave={() => { isDragging.current = false; if (tableRef.current) tableRef.current.style.cursor = "grab"; }}
            >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: t.surfaceAlt, borderBottom: `1px solid ${t.border}` }}>
                  {["Name", "Company", "Role", "Stage", "Location", "Added", "TWLR"].map(col => (
                    <th key={col} style={{
                      padding: "10px 16px", textAlign: "left", fontWeight: 600,
                      color: t.textMuted, fontSize: "0.72rem", letterSpacing: "0.05em",
                      textTransform: "uppercase", whiteSpace: "nowrap",
                      ...(col === "Name" ? { position: "sticky", left: 0, zIndex: 2, background: t.surfaceAlt } : {}),
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => {
                  const sc = STAGE_COLORS[c.stage] ?? { bg: "#9D9BAA22", text: "#5A5870" };
                  return (
                    <tr key={c.id}
                      style={{ borderBottom: i < contacts.length - 1 ? `1px solid ${t.border}` : "none", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.background = t.surfaceAlt)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      onClick={e => {
                        if ((e.target as HTMLElement).closest("select,button,a")) return;
                        setDrawerContact(c as unknown as DrawerContact);
                        setDrawerNew(false);
                        setDrawerOpen(true);
                      }}
                    >
                      <td style={{ padding: "11px 16px", position: "sticky", left: 0, zIndex: 1, background: t.surface, boxShadow: "2px 0 6px rgba(0,0,0,0.08)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 600, color: t.text, fontSize: "0.85rem" }}>{name(c)}</span>
                          {c.twlr_subscriber && (
                            <span style={{
                              background: "#F4A98822", color: "#C1573B", borderRadius: 999,
                              padding: "1px 7px", fontSize: "0.62rem", fontWeight: 700,
                              letterSpacing: "0.04em", whiteSpace: "nowrap",
                            }}>TWLR</span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: t.textFaint, marginTop: 2 }}>{c.email}</div>
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
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <select
                            value={c.stage}
                            disabled={updatingId === c.id}
                            onChange={e => updateStage(c.id, e.target.value)}
                            style={{
                              background: sc.bg, color: sc.text,
                              border: `1px solid ${sc.text}33`,
                              borderRadius: 999, padding: "3px 10px",
                              fontSize: "0.7rem", fontWeight: 600,
                              cursor: "pointer", fontFamily: "inherit",
                              outline: "none", opacity: updatingId === c.id ? 0.5 : 1,
                            }}
                          >
                            {ALL_STAGES.filter(s => s !== "All").map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          {savedId === c.id && (
                            <span style={{ color: "#7A8A5C", fontSize: "0.75rem", fontWeight: 700 }}>✓</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "11px 16px", color: t.textMuted, fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                        {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td style={{ padding: "11px 16px", color: t.textFaint, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ padding: "11px 16px", textAlign: "center" }}>
                        <button
                          disabled={twlrUpdating === c.id}
                          onClick={() => updateTwlr(c.id, !c.twlr_subscriber)}
                          title={c.twlr_subscriber ? "Remove TWLR" : "Add TWLR"}
                          style={{
                            background: c.twlr_subscriber ? "#F4A98822" : "transparent",
                            color: c.twlr_subscriber ? "#C1573B" : t.textFaint,
                            border: `1px solid ${c.twlr_subscriber ? "#F4A98866" : t.border}`,
                            borderRadius: 999, padding: "2px 10px",
                            fontSize: "0.68rem", fontWeight: 700,
                            cursor: twlrUpdating === c.id ? "not-allowed" : "pointer",
                            opacity: twlrUpdating === c.id ? 0.5 : 1,
                            letterSpacing: "0.04em", fontFamily: "inherit",
                            transition: "all 0.15s",
                          }}
                        >
                          {c.twlr_subscriber ? "✓ TWLR" : "+ TWLR"}
                        </button>
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

      {drawerOpen && (
        <ContactDrawer
          contact={drawerContact}
          isNew={drawerNew}
          dark={dark}
          onClose={() => setDrawerOpen(false)}
          onSaved={(saved) => {
            if (drawerNew) {
              setContacts(prev => [saved as unknown as Contact, ...prev]);
              setTotal(prev => prev + 1);
            } else {
              setContacts(prev => prev.map(c => c.id === saved.id ? { ...c, ...saved } as Contact : c));
            }
            setDrawerOpen(false);
          }}
          onDeleted={(id) => {
            setContacts(prev => prev.filter(c => c.id !== id));
            setTotal(prev => prev - 1);
            setDrawerOpen(false);
          }}
        />
      )}
    </main>
  );
}
