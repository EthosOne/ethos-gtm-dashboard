"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
  DragOverlay, closestCenter,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

const STAGE_COLOR: Record<string, { bg: string; text: string; header: string }> = {
  "Cold":        { bg: "#9D9BAA22", text: "#5A5870", header: "#9D9BAA" },
  "Nurture":     { bg: "#7E9AA822", text: "#3A6070", header: "#7E9AA8" },
  "Qualified":   { bg: "#7A8A5C22", text: "#3F5030", header: "#7A8A5C" },
  "Demo Booked": { bg: "#E8B66A22", text: "#9A6A00", header: "#E8B66A" },
  "Closed Won":  { bg: "#3F584722", text: "#2A3F30", header: "#3F5847" },
  "Closed Lost": { bg: "#C1573B22", text: "#8A3A25", header: "#C1573B" },
};

const CARDS_PER_STAGE = 30;

type Contact = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  stage: string;
  twlr_subscriber?: boolean;
};

function cardName(c: Contact) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
}

function KanbanCard({
  contact, t, isDragging,
}: { contact: Contact; t: typeof LIGHT; isDragging?: boolean }) {
  const sc = STAGE_COLOR[contact.stage] ?? STAGE_COLOR["Cold"];
  return (
    <div style={{
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      padding: "10px 12px",
      cursor: "grab",
      opacity: isDragging ? 0.4 : 1,
      boxShadow: isDragging ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
      transition: "opacity 0.15s",
      userSelect: "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <div style={{ fontWeight: 600, fontSize: "0.82rem", color: t.text, lineHeight: 1.3 }}>
          {cardName(contact)}
        </div>
        {contact.twlr_subscriber && (
          <span style={{
            background: "#F4A98822", color: "#C1573B", borderRadius: 999,
            padding: "1px 6px", fontSize: "0.6rem", fontWeight: 700,
            letterSpacing: "0.04em", whiteSpace: "nowrap", flexShrink: 0,
          }}>TWLR</span>
        )}
      </div>
      {contact.company && (
        <div style={{ fontSize: "0.72rem", color: t.textMuted, marginTop: 3 }}>
          {contact.company}
        </div>
      )}
      {contact.job_title && (
        <div style={{ fontSize: "0.7rem", color: t.textFaint, marginTop: 2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {contact.job_title}
        </div>
      )}
    </div>
  );
}

function SortableCard({ contact, t }: { contact: Contact; t: typeof LIGHT }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: contact.id,
    data: { stage: contact.stage },
  });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes} {...listeners}>
      <KanbanCard contact={contact} t={t} isDragging={isDragging} />
    </div>
  );
}

function StageColumn({
  stage, contacts, count, t, isOver,
}: { stage: string; contacts: Contact[]; count: number; t: typeof LIGHT; isOver: boolean }) {
  const sc = STAGE_COLOR[stage] ?? STAGE_COLOR["Cold"];
  return (
    <div style={{
      background: isOver ? `${sc.header}11` : t.surfaceAlt,
      border: `1px solid ${isOver ? sc.header : t.border}`,
      borderRadius: 14,
      minWidth: 240,
      width: 260,
      display: "flex",
      flexDirection: "column",
      maxHeight: "calc(100vh - 180px)",
      transition: "background 0.15s, border 0.15s",
      flexShrink: 0,
    }}>
      {/* Column header */}
      <div style={{
        padding: "12px 14px",
        borderBottom: `1px solid ${t.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.header, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: "0.82rem", color: t.text }}>{stage}</span>
        </div>
        <span style={{
          background: sc.bg, color: sc.text,
          borderRadius: 999, padding: "2px 8px",
          fontSize: "0.7rem", fontWeight: 700,
        }}>{count.toLocaleString()}</span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        <SortableContext items={contacts.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {contacts.map(c => <SortableCard key={c.id} contact={c} t={t} />)}
        </SortableContext>
        {count > CARDS_PER_STAGE && (
          <div style={{ fontSize: "0.72rem", color: t.textFaint, textAlign: "center", padding: "6px 0" }}>
            +{(count - contacts.length).toLocaleString()} more — use Pipeline to see all
          </div>
        )}
        {contacts.length === 0 && (
          <div style={{ fontSize: "0.75rem", color: t.textFaint, textAlign: "center", padding: "20px 0" }}>
            No leads
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const [contactsByStage, setContactsByStage] = useState<Record<string, Contact[]>>({});
  const [stageCounts, setStageCounts]         = useState<Record<string, number>>({});
  const [loading, setLoading]                 = useState(true);
  const [dark, setDark]                       = useState(false);
  const [activeContact, setActiveContact]     = useState<Contact | null>(null);
  const [overStage, setOverStage]             = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem("ethos-theme") === "dark") setDark(true);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const results: Record<string, Contact[]> = {};
    const counts: Record<string, number> = {};

    await Promise.all(STAGES.map(async stage => {
      const { data, count } = await supabase
        .from("contacts")
        .select("id,email,first_name,last_name,company,job_title,stage", { count: "exact" })
        .eq("stage", stage)
        .order("created_at", { ascending: false })
        .limit(CARDS_PER_STAGE);
      results[stage] = data ?? [];
      counts[stage] = count ?? 0;
    }));

    setContactsByStage(results);
    setStageCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function handleDragStart(e: DragStartEvent) {
    const id = e.active.id as number;
    for (const stage of STAGES) {
      const found = contactsByStage[stage]?.find(c => c.id === id);
      if (found) { setActiveContact(found); break; }
    }
  }

  function handleDragOver(e: DragOverEvent) {
    const overId = e.over?.id;
    if (!overId) { setOverStage(null); return; }
    // Check if over a stage column (string) or a card (number)
    if (typeof overId === "string" && STAGES.includes(overId)) {
      setOverStage(overId);
    } else {
      for (const stage of STAGES) {
        if (contactsByStage[stage]?.find(c => c.id === overId)) {
          setOverStage(stage); return;
        }
      }
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveContact(null);
    setOverStage(null);
    const { active, over } = e;
    if (!over || !activeContact) return;

    const fromStage = activeContact.stage;
    let toStage = fromStage;

    if (typeof over.id === "string" && STAGES.includes(over.id)) {
      toStage = over.id;
    } else {
      for (const stage of STAGES) {
        if (contactsByStage[stage]?.find(c => c.id === over.id)) {
          toStage = stage; break;
        }
      }
    }

    if (toStage === fromStage) return;

    // Optimistic update
    setContactsByStage(prev => {
      const fromList = prev[fromStage].filter(c => c.id !== activeContact.id);
      const toList = [{ ...activeContact, stage: toStage }, ...(prev[toStage] ?? [])];
      return { ...prev, [fromStage]: fromList, [toStage]: toList };
    });
    setStageCounts(prev => ({
      ...prev,
      [fromStage]: Math.max(0, (prev[fromStage] ?? 0) - 1),
      [toStage]: (prev[toStage] ?? 0) + 1,
    }));

    const res = await fetch("/api/leads/update-stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeContact.id, stage: toStage }),
    });
    if (!res.ok) loadData();
  }

  const t = dark ? DARK : LIGHT;

  return (
    <main style={{ background: t.bg, minHeight: "100vh", transition: "background 0.3s", overflow: "hidden" }}>
      <div style={{ maxWidth: "100%", padding: "2rem 1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
          <div>
            <img src="/ethos-wordmark.png" alt="Ethos One"
              style={{ height: 26, marginBottom: 8, display: "block", filter: t.logoFilter }} />
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: t.text, letterSpacing: "-0.02em" }}>
              Kanban
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Link href="/" style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              textDecoration: "none", borderRadius: 999, padding: "6px 14px",
              fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.04em",
            }}>← Home</Link>
            <Link href="/leads" style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              textDecoration: "none", borderRadius: 999, padding: "6px 14px",
              fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.04em",
            }}>Pipeline →</Link>
            <button onClick={() => setDark(d => !d)} style={{
              background: t.toggleBg, color: t.toggleText, border: "none",
              borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem",
              fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em", fontFamily: "inherit",
            }}>{dark ? "☀ Light" : "◑ Dark"}</button>
          </div>
        </div>

        <div style={{ height: 1, background: t.border, marginBottom: "1.5rem" }} />

        {loading ? (
          <div style={{ color: t.textMuted, fontSize: "0.9rem" }}>Loading…</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "1rem" }}>
              {STAGES.map(stage => (
                <StageColumn
                  key={stage}
                  stage={stage}
                  contacts={contactsByStage[stage] ?? []}
                  count={stageCounts[stage] ?? 0}
                  t={t}
                  isOver={overStage === stage}
                />
              ))}
            </div>

            <DragOverlay>
              {activeContact && <KanbanCard contact={activeContact} t={t} />}
            </DragOverlay>
          </DndContext>
        )}

        <div style={{
          marginTop: "2rem", paddingTop: "1.25rem", borderTop: `1px solid ${t.border}`,
          fontSize: "0.75rem", color: t.textFaint,
          display: "flex", justifyContent: "space-between",
        }}>
          <span>Ethos One · Kanban · 2026</span>
          <span style={{ fontSize: "0.7rem" }}>Showing up to {CARDS_PER_STAGE} per column · drag to move</span>
        </div>
      </div>
    </main>
  );
}
