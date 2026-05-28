"use client";

import { useState, useEffect } from "react";

const ALL_STAGES = ["Cold", "Nurture", "Qualified", "Demo Booked", "Closed Won", "Closed Lost"];

export type Contact = {
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
  twlr_subscriber: boolean | null;
  outreach_status: string | null;
  list_name: string | null;
  notes: string | null;
  icp_score: number | null;
  icp_tier: string | null;
  created_at: string;
  updated_at: string;
  demo_scheduled: string | null;
};

type Props = {
  contact: Contact | null;
  isNew?: boolean;
  dark: boolean;
  onClose: () => void;
  onSaved: (contact: Contact) => void;
  onDeleted: (id: number) => void;
};

const LIGHT = {
  bg: "#E3E1E8", surface: "#FFFFFF", surfaceAlt: "#F5F3EF",
  border: "rgba(54,53,65,0.12)", text: "#363541", textMuted: "#4A4858",
  textFaint: "#7A7888", accent: "#F4A988",
};
const DARK = {
  bg: "#363541", surface: "#2A2935", surfaceAlt: "#1F1E2B",
  border: "rgba(227,225,232,0.08)", text: "#E3E1E8", textMuted: "#9D9BAA",
  textFaint: "#5C5A6A", accent: "#F4A988",
};

const EMPTY: Omit<Contact, "id"|"source"|"created_at"|"updated_at"|"demo_scheduled"> = {
  email: "", first_name: "", last_name: "", company: "", company_domain: "",
  job_title: "", linkedin_url: "", city: "", country: "", stage: "Cold",
  twlr_subscriber: false, outreach_status: "active", notes: "", icp_score: null, icp_tier: null,
};

export default function ContactDrawer({ contact, isNew, dark, onClose, onSaved, onDeleted }: Props) {
  const t = dark ? DARK : LIGHT;
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contact) {
      setForm({
        email: contact.email ?? "",
        first_name: contact.first_name ?? "",
        last_name: contact.last_name ?? "",
        company: contact.company ?? "",
        company_domain: contact.company_domain ?? "",
        job_title: contact.job_title ?? "",
        linkedin_url: contact.linkedin_url ?? "",
        city: contact.city ?? "",
        country: contact.country ?? "",
        stage: contact.stage ?? "Cold",
        twlr_subscriber: contact.twlr_subscriber ?? false,
        outreach_status: contact.outreach_status ?? "active",
        notes: contact.notes ?? "",
        icp_score: contact.icp_score,
        icp_tier: contact.icp_tier ?? "",
      });
    } else {
      setForm({ ...EMPTY });
    }
    setConfirmDelete(false);
    setError(null);
  }, [contact, isNew]);

  function set(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const url = isNew ? "/api/leads/create" : "/api/leads/update";
    const body = isNew ? form : { id: contact!.id, ...form };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error ?? "Error saving"); return; }
    onSaved(isNew ? json.contact : { ...contact!, ...form });
  }

  async function doDelete() {
    setDeleting(true);
    const res = await fetch("/api/leads/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contact!.id }),
    });
    setDeleting(false);
    if (res.ok) onDeleted(contact!.id);
  }

  const inputStyle = {
    width: "100%", background: t.surfaceAlt, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: "7px 11px", fontSize: "0.83rem", color: t.text,
    outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const,
  };
  const labelStyle = {
    fontSize: "0.68rem", fontWeight: 700, color: t.textFaint,
    letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 4, display: "block",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
          zIndex: 40, transition: "opacity 0.2s",
        }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
        background: t.surface, zIndex: 50, overflowY: "auto",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px", borderBottom: `1px solid ${t.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, background: t.surface, zIndex: 1,
        }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: t.text }}>
            {isNew ? "New Contact" : "Contact Details"}
          </h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: t.textFaint, fontSize: "1.2rem", lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>

        {/* Form */}
        <div style={{ padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email {isNew && <span style={{ color: "#C1573B" }}>*</span>}</label>
            <input
              value={form.email}
              readOnly={!isNew}
              onChange={e => set("email", e.target.value)}
              style={{ ...inputStyle, opacity: isNew ? 1 : 0.65, cursor: isNew ? "text" : "default" }}
              placeholder="email@company.com"
            />
            {!isNew && <div style={{ fontSize: "0.68rem", color: t.textFaint, marginTop: 4 }}>Email is the unique ID — cannot be changed</div>}
          </div>

          {/* Name row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input value={form.first_name ?? ""} onChange={e => set("first_name", e.target.value)} style={inputStyle} placeholder="Jane" />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input value={form.last_name ?? ""} onChange={e => set("last_name", e.target.value)} style={inputStyle} placeholder="Smith" />
            </div>
          </div>

          {/* Company */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Company</label>
              <input value={form.company ?? ""} onChange={e => set("company", e.target.value)} style={inputStyle} placeholder="Acme Ltd" />
            </div>
            <div>
              <label style={labelStyle}>Domain</label>
              <input value={form.company_domain ?? ""} onChange={e => set("company_domain", e.target.value)} style={inputStyle} placeholder="acme.com" />
            </div>
          </div>

          {/* Role */}
          <div>
            <label style={labelStyle}>Job Title</label>
            <input value={form.job_title ?? ""} onChange={e => set("job_title", e.target.value)} style={inputStyle} placeholder="Head of People & Culture" />
          </div>

          {/* LinkedIn */}
          <div>
            <label style={labelStyle}>LinkedIn URL</label>
            <input value={form.linkedin_url ?? ""} onChange={e => set("linkedin_url", e.target.value)} style={inputStyle} placeholder="https://linkedin.com/in/..." />
          </div>

          {/* Location */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>City</label>
              <input value={form.city ?? ""} onChange={e => set("city", e.target.value)} style={inputStyle} placeholder="London" />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input value={form.country ?? ""} onChange={e => set("country", e.target.value)} style={inputStyle} placeholder="United Kingdom" />
            </div>
          </div>

          {/* Stage */}
          <div>
            <label style={labelStyle}>Stage</label>
            <select value={form.stage} onChange={e => set("stage", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {ALL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* List Name — read only */}
          {contact?.list_name && (
            <div>
              <label style={labelStyle}>Source List</label>
              <div style={{ ...inputStyle, opacity: 0.65, cursor: "default", color: t.textMuted }}>
                {contact.list_name}
              </div>
            </div>
          )}

          {/* TWLR toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: t.surfaceAlt, borderRadius: 10, border: `1px solid ${t.border}` }}>
            <div>
              <div style={{ fontSize: "0.83rem", fontWeight: 600, color: t.text }}>TWLR Subscriber</div>
              <div style={{ fontSize: "0.72rem", color: t.textFaint }}>The Work-Life Reporter newsletter</div>
            </div>
            <button
              onClick={() => set("twlr_subscriber", !form.twlr_subscriber)}
              style={{
                width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
                background: form.twlr_subscriber ? "#F4A988" : t.border,
                position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: form.twlr_subscriber ? 22 : 3,
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s", display: "block",
              }} />
            </button>
          </div>

          {/* Outreach status toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: t.surfaceAlt, borderRadius: 10, border: `1px solid ${form.outreach_status === "gdpr_hold" ? "#C1573B44" : t.border}` }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: "0.83rem", fontWeight: 600, color: t.text }}>Cold Email Outreach</div>
                {form.outreach_status === "gdpr_hold" && (
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, background: "#C1573B22", color: "#C1573B", borderRadius: 4, padding: "1px 6px", letterSpacing: "0.04em" }}>GDPR HOLD</span>
                )}
              </div>
              <div style={{ fontSize: "0.72rem", color: t.textFaint }}>
                {form.outreach_status === "gdpr_hold" ? "Excluded from cold email — GDPR restricted country" : "Included in cold email sequences"}
              </div>
            </div>
            <button
              onClick={() => set("outreach_status", form.outreach_status === "gdpr_hold" ? "active" : "gdpr_hold")}
              style={{
                width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
                background: form.outreach_status === "gdpr_hold" ? "#C1573B" : "#4CAF50",
                position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: form.outreach_status === "gdpr_hold" ? 3 : 22,
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s", display: "block",
              }} />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes ?? ""}
              onChange={e => set("notes", e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Any context about this contact…"
            />
          </div>

          {error && (
            <div style={{ background: "#C1573B22", color: "#C1573B", borderRadius: 8, padding: "8px 12px", fontSize: "0.8rem" }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: "16px 24px", borderTop: `1px solid ${t.border}`,
          position: "sticky", bottom: 0, background: t.surface,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
        }}>
          {!isNew && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                background: "none", border: `1px solid #C1573B44`, color: "#C1573B",
                borderRadius: 8, padding: "8px 14px", fontSize: "0.8rem",
                fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >Delete</button>
          )}
          {!isNew && confirmDelete && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: "0.78rem", color: "#C1573B", fontWeight: 600 }}>Sure?</span>
              <button onClick={doDelete} disabled={deleting} style={{
                background: "#C1573B", color: "#fff", border: "none",
                borderRadius: 8, padding: "6px 12px", fontSize: "0.78rem",
                fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>{deleting ? "…" : "Yes, delete"}</button>
              <button onClick={() => setConfirmDelete(false)} style={{
                background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
                borderRadius: 8, padding: "6px 12px", fontSize: "0.78rem",
                cursor: "pointer", fontFamily: "inherit",
              }}>Cancel</button>
            </div>
          )}
          {(isNew || !confirmDelete) && <div style={{ flex: 1 }} />}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              borderRadius: 8, padding: "8px 16px", fontSize: "0.83rem",
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{
              background: t.accent, color: "#fff", border: "none",
              borderRadius: 8, padding: "8px 20px", fontSize: "0.83rem",
              fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: saving ? 0.7 : 1,
            }}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </div>
    </>
  );
}
