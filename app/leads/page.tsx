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
  outreach_status: string | null;
  list_name: string | null;
  beehiiv_engaged: boolean | null;
  affiliate_code: string | null;
  first_touch_source: { utm_source?: string; utm_medium?: string; utm_campaign?: string } | null;
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
const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];

export default function LeadsPage() {
  const [contacts, setContacts]       = useState<Contact[]>([]);
  const [total, setTotal]             = useState(0);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [twlrCount, setTwlrCount]       = useState(0);
  const [engagedCount, setEngagedCount]   = useState(0);
  const [gdprCount, setGdprCount]         = useState(0);
  const [linkedinCount, setLinkedinCount] = useState(0);
  const [stage, setStage]             = useState("All");
  const [page, setPage]               = useState(0);
  const [sortField, setSortField]     = useState("created_at");
  const [sortDir, setSortDir]         = useState<"asc"|"desc">("desc");
  const [loading, setLoading]         = useState(true);
  const [dark, setDark]               = useState(false);
  const [search, setSearch]           = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pageInput, setPageInput]     = useState("");
  const [updatingId, setUpdatingId]     = useState<number | null>(null);
  const [savedId, setSavedId]           = useState<number | null>(null);
  const [pageSize, setPageSize]           = useState(50);
  const [linkedinOnly, setLinkedinOnly]   = useState(false);
  const [twlrOnly, setTwlrOnly]         = useState(false);
  const [engagedOnly, setEngagedOnly]   = useState(false);
  const [gdprOnly, setGdprOnly]         = useState(false);
  const [twlrUpdating, setTwlrUpdating] = useState<number | null>(null);
  const [listOptions, setListOptions]   = useState<string[]>([]);
  const [listFilter, setListFilter]     = useState("");
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
      .order(sortField, { ascending: sortDir === "asc", nullsFirst: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (stage !== "All") q = q.eq("stage", stage);
    if (twlrOnly) q = q.eq("twlr_subscriber", true);
    if (engagedOnly) q = q.eq("beehiiv_engaged", true);
    if (gdprOnly) q = q.eq("outreach_status", "gdpr_hold");
    if (linkedinOnly) q = q.not("linkedin_url", "is", null);
    if (listFilter) q = q.eq("list_name", listFilter);
    if (search) {
      q = q.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%,job_title.ilike.%${search}%,country.ilike.%${search}%`
      );
    }
    const { data, count } = await q;
    if (data) setContacts(data);
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [stage, page, pageSize, search, twlrOnly, engagedOnly, gdprOnly, linkedinOnly, listFilter, sortField, sortDir]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => {
    const channel = supabase
      .channel("contacts-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "contacts" }, (payload) => {
        setContacts(prev => prev.map(c => c.id === (payload.new as Contact).id ? { ...c, ...(payload.new as Contact) } : c));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("beehiiv_engaged", true)
      .then(({ count }) => setEngagedCount(count ?? 0));
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("outreach_status", "gdpr_hold")
      .then(({ count }) => setGdprCount(count ?? 0));
    supabase.from("contacts").select("*", { count: "exact", head: true }).not("linkedin_url", "is", null)
      .then(({ count }) => setLinkedinCount(count ?? 0));

    supabase.from("contacts").select("list_name").not("list_name", "is", null)
      .then(({ data }) => {
        if (data) {
          const unique = Array.from(new Set(data.map((r: { list_name: string }) => r.list_name))).sort();
          setListOptions(unique);
        }
      });
  }, []);

  const t = dark ? DARK : LIGHT;
  const totalPages = Math.ceil(total / pageSize);

  function toggleSort(field: string) {
    if (sortField !== field) { setSortField(field); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortField("created_at"); setSortDir("desc"); }
    setPage(0);
  }

  function name(c: Contact) {
    return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
  }

  return (
    <main style={{ background: t.bg, minHeight: "100vh", padding: 0, transition: "background 0.3s", overflowX: "hidden" }}>
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
              <i className={dark ? "bi bi-sun-fill" : "bi bi-moon-fill"} style={{ marginRight: 5, color: t.toggleText }} />{dark ? "Light" : "Dark"}
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
              <button key={s} onClick={() => { setStage(s); setTwlrOnly(false); setListFilter(""); setPage(0); }} style={{
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
          <button onClick={() => { setTwlrOnly(v => !v); setEngagedOnly(false); setGdprOnly(false); setLinkedinOnly(false); setListFilter(""); setStage("All"); setPage(0); }} style={{
            background: twlrOnly ? "#F4A98822" : t.surface,
            border: `1px solid ${twlrOnly ? "#F4A98866" : t.border}`,
            color: twlrOnly ? "#C1573B" : t.textMuted,
            borderRadius: 999, padding: "5px 13px", cursor: "pointer",
            fontSize: "0.78rem", fontWeight: 700, fontFamily: "inherit",
            letterSpacing: "0.03em", transition: "all 0.15s",
          }}>
            TWLR{(() => { const n = twlrOnly ? total : twlrCount; return n > 0 ? <span style={{ marginLeft: 5, opacity: 0.65 }}>({n.toLocaleString()})</span> : null; })()}{twlrOnly && " ✓"}
          </button>
          <button onClick={() => { setEngagedOnly(v => !v); setTwlrOnly(false); setGdprOnly(false); setLinkedinOnly(false); setListFilter(""); setStage("All"); setPage(0); }} style={{
            background: engagedOnly ? "#7E9AA822" : t.surface,
            border: `1px solid ${engagedOnly ? "#2A607066" : t.border}`,
            color: engagedOnly ? "#2A6070" : t.textMuted,
            borderRadius: 999, padding: "5px 13px", cursor: "pointer",
            fontSize: "0.78rem", fontWeight: 700, fontFamily: "inherit",
            letterSpacing: "0.03em", transition: "all 0.15s",
          }}>
            Engaged{(() => { const n = engagedOnly ? total : engagedCount; return n > 0 ? <span style={{ marginLeft: 5, opacity: 0.65 }}>({n.toLocaleString()})</span> : null; })()}{engagedOnly && " ✓"}
          </button>
          <button onClick={() => { setLinkedinOnly(v => !v); setTwlrOnly(false); setEngagedOnly(false); setGdprOnly(false); setListFilter(""); setStage("All"); setPage(0); }} style={{
            background: linkedinOnly ? "#0A66C222" : t.surface,
            border: `1px solid ${linkedinOnly ? "#0A66C266" : t.border}`,
            color: linkedinOnly ? "#0A66C2" : t.textMuted,
            borderRadius: 999, padding: "5px 13px", cursor: "pointer",
            fontSize: "0.78rem", fontWeight: 700, fontFamily: "inherit",
            letterSpacing: "0.03em", transition: "all 0.15s",
          }}>
            LinkedIn{(() => { const n = linkedinOnly ? total : linkedinCount; return n > 0 ? <span style={{ marginLeft: 5, opacity: 0.65 }}>({n.toLocaleString()})</span> : null; })()}{linkedinOnly && " ✓"}
          </button>
          <button onClick={() => { setGdprOnly(v => !v); setTwlrOnly(false); setEngagedOnly(false); setLinkedinOnly(false); setListFilter(""); setStage("All"); setPage(0); }} style={{
            background: gdprOnly ? "#C1573B22" : t.surface,
            border: `1px solid ${gdprOnly ? "#C1573B66" : t.border}`,
            color: gdprOnly ? "#C1573B" : t.textMuted,
            borderRadius: 999, padding: "5px 13px", cursor: "pointer",
            fontSize: "0.78rem", fontWeight: 700, fontFamily: "inherit",
            letterSpacing: "0.03em", transition: "all 0.15s",
          }}>
            GDPR Hold{(() => { const n = gdprOnly ? total : gdprCount; return n > 0 ? <span style={{ marginLeft: 5, opacity: 0.65 }}>({n.toLocaleString()})</span> : null; })()}{gdprOnly && " ✓"}
          </button>
          {listOptions.length > 0 && (
            <select
              value={listFilter}
              onChange={e => { setListFilter(e.target.value); setTwlrOnly(false); setEngagedOnly(false); setGdprOnly(false); setLinkedinOnly(false); setStage("All"); setPage(0); }}
              style={{
                background: t.surface,
                border: `1px solid ${listFilter ? t.accent : t.border}`,
                color: listFilter ? t.text : t.textMuted,
                borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                fontSize: "0.78rem", fontWeight: 600, fontFamily: "inherit",
                outline: "none", colorScheme: dark ? "dark" : "light",
                transition: "border-color 0.15s, color 0.15s",
              }}
            >
              <option value="">List: All</option>
              {listOptions.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}
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
                  {([
                    { label: "Name",     field: "first_name" },
                    { label: "Company",  field: "company" },
                    { label: "Role",     field: "job_title" },
                    { label: "Stage",    field: "stage" },
                    { label: "Location", field: "country" },
                    { label: "List",     field: null },
                    { label: "Added",    field: "created_at" },
                    { label: "TWLR",     field: null },
                  ] as { label: string; field: string | null }[]).map(({ label, field }) => (
                    <th key={label}
                      onClick={() => field && toggleSort(field)}
                      style={{
                        padding: "10px 16px", textAlign: "left", fontWeight: 600,
                        color: field && sortField === field ? t.text : t.textMuted,
                        fontSize: "0.72rem", letterSpacing: "0.05em",
                        textTransform: "uppercase", whiteSpace: "nowrap",
                        cursor: field ? "pointer" : "default",
                        userSelect: "none",
                        ...(label === "Name" ? { position: "sticky", left: 0, zIndex: 2, background: t.surfaceAlt } : {}),
                      }}>
                      {label}
                      {field && sortField === field && (
                        <span style={{ marginLeft: 4, opacity: 0.8 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                      {field && sortField !== field && (
                        <span style={{ marginLeft: 4, opacity: 0.2 }}>↕</span>
                      )}
                    </th>
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
                          {c.beehiiv_engaged && (
                            <span style={{
                              background: "#7E9AA822", color: "#2A6070", borderRadius: 999,
                              padding: "1px 7px", fontSize: "0.62rem", fontWeight: 700,
                              letterSpacing: "0.04em", whiteSpace: "nowrap",
                            }}>Engaged</span>
                          )}
                          {c.linkedin_url && (
                            <span style={{
                              background: "#0A66C222", color: "#0A66C2", borderRadius: 999,
                              padding: "1px 7px", fontSize: "0.62rem", fontWeight: 700,
                              letterSpacing: "0.04em", whiteSpace: "nowrap",
                            }}>in</span>
                          )}
                          {c.outreach_status === "gdpr_hold" && (
                            <span style={{
                              background: "#C1573B22", color: "#C1573B", borderRadius: 4,
                              padding: "1px 6px", fontSize: "0.62rem", fontWeight: 700,
                              letterSpacing: "0.04em", whiteSpace: "nowrap",
                            }}>GDPR</span>
                          )}
                          {c.affiliate_code && (
                            <span title={`Referred via ${c.affiliate_code}`} style={{
                              background: "#7A8A5C22", color: "#3F5030", borderRadius: 999,
                              padding: "1px 7px", fontSize: "0.62rem", fontWeight: 700,
                              letterSpacing: "0.04em", whiteSpace: "nowrap",
                            }}>★ {c.affiliate_code}</span>
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
                      <td style={{ padding: "11px 16px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.list_name
                          ? <span style={{ fontSize: "0.7rem", color: t.textFaint, background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 4, padding: "2px 7px" }}>{c.list_name}</span>
                          : <span style={{ color: t.textFaint, fontSize: "0.75rem" }}>—</span>
                        }
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
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: t.textFaint, fontSize: "0.78rem" }}>
                {(page * pageSize + 1).toLocaleString()}–{Math.min((page + 1) * pageSize, total).toLocaleString()} of {total.toLocaleString()}
              </span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                style={{
                  background: t.surface, border: `1px solid ${t.border}`,
                  borderRadius: 8, padding: "4px 8px", fontSize: "0.75rem",
                  color: t.textMuted, cursor: "pointer", fontFamily: "inherit", outline: "none",
                  appearance: "none", WebkitAppearance: "none",
                }}
              >
                {PAGE_SIZE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </div>
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
