"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import Link from "next/link";

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

const TARGET_FIELDS = [
  { key: "email",           label: "Email",           required: true  },
  { key: "first_name",      label: "First Name",      required: false },
  { key: "last_name",       label: "Last Name",       required: false },
  { key: "job_title",       label: "Job Title",       required: false },
  { key: "company",         label: "Company",         required: false },
  { key: "company_domain",  label: "Company Domain",  required: false },
  { key: "company_website", label: "Company Website", required: false },
  { key: "linkedin_url",    label: "LinkedIn URL",    required: false },
  { key: "city",            label: "City",            required: false },
  { key: "country",         label: "Country",         required: false },
];

const AUTO_MAP: Record<string, string[]> = {
  email:           ["email", "e-mail", "email address"],
  first_name:      ["first name", "firstname", "first_name"],
  last_name:       ["last name", "lastname", "last_name"],
  job_title:       ["prospect job title", "job title", "title", "position", "role"],
  company:         ["company name", "company", "organization"],
  company_domain:  ["company domain name", "domain", "company domain"],
  company_website: ["company website", "website"],
  linkedin_url:    ["linkedin profile", "linkedin", "linkedin url", "linkedin_profile"],
  city:            ["city"],
  country:         ["country"],
};

function buildAutoMap(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const [field, patterns] of Object.entries(AUTO_MAP)) {
    for (const p of patterns) {
      const idx = lower.indexOf(p);
      if (idx !== -1) { result[field] = headers[idx]; break; }
    }
  }
  return result;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
    else if (c === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else { cur += c; }
  }
  result.push(cur.trim());
  return result;
}

function readCSVMeta(text: string): { headers: string[]; totalRows: number; preview: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  const headers = parseCSVLine(lines[0]);
  const dataLines = lines.slice(1).filter(l => l.trim());
  const preview = dataLines.slice(0, 5).map(line => {
    const vals = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  });
  return { headers, totalRows: dataLines.length, preview };
}

type ImportResult = { imported: number; skipped: number; errors: string[] };

export default function ImportPage() {
  const [dark, setDark]           = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("ethos-theme") === "dark"
  );
  const [headers, setHeaders]     = useState<string[]>([]);
  const [preview, setPreview]     = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [fileName, setFileName]   = useState("");
  const [mapping, setMapping]     = useState<Record<string, string>>({});
  const [file, setFile]           = useState<File | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function toggleTheme() {
    setDark(prev => {
      localStorage.setItem("ethos-theme", !prev ? "dark" : "light");
      return !prev;
    });
  }

  const processFile = useCallback((f: File) => {
    if (!f.name.match(/\.(csv)$/i)) return;
    setFile(f);
    setFileName(f.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const meta = readCSVMeta(text);
      setHeaders(meta.headers);
      setTotalRows(meta.totalRows);
      setPreview(meta.preview);
      setMapping(buildAutoMap(meta.headers));
    };
    reader.readAsText(f);
  }, []);

  function onFileInput(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }

  async function handleImport() {
    if (!file || !mapping.email) return;
    setImporting(true);
    setResult(null);

    const form = new FormData();
    form.append("file", file);
    form.append("mapping", JSON.stringify(mapping));

    try {
      const res = await fetch("/api/leads/import", { method: "POST", body: form });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ imported: 0, skipped: 0, errors: ["Network error — check your connection"] });
    } finally {
      setImporting(false);
    }
  }

  const t = dark ? DARK : LIGHT;
  const hasFile = headers.length > 0;
  const canImport = hasFile && !!mapping.email && !importing;
  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <main style={{ background: t.bg, minHeight: "100vh", padding: 0, transition: "background 0.3s", overflowX: "hidden" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <img src="/ethos-wordmark.png" alt="Ethos One"
              style={{ height: 26, marginBottom: 8, display: "block", filter: t.logoFilter, transition: "filter 0.3s" }} />
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: t.text, letterSpacing: "-0.02em" }}>
              Import CSV
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Link href="/leads" style={{
              background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
              textDecoration: "none", borderRadius: 999, padding: "6px 14px",
              fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.04em",
            }}>
              ← Pipeline
            </Link>
          <button onClick={toggleTheme} style={{
            background: t.toggleBg, color: t.toggleText, border: "none",
            borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem",
            fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em",
            transition: "background 0.3s, color 0.3s", fontFamily: "inherit",
          }}>
            <i className={dark ? "bi bi-sun-fill" : "bi bi-moon-half"} style={{ marginRight: 5, color: "inherit" }} />{dark ? "Light" : "Dark"}
          </button>
          </div>
        </div>

        {/* Drop zone */}
        {!hasFile && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{
              background: dragging ? `${t.accent}18` : t.surface,
              border: `2px dashed ${dragging ? t.accent : t.border}`,
              borderRadius: 14, padding: "3.5rem 2rem", textAlign: "center",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <i className="bi-file-earmark-spreadsheet" style={{ fontSize: "2rem", color: t.textFaint, display: "block", marginBottom: 12 }} />
            <div style={{ fontWeight: 600, color: t.text, marginBottom: 6 }}>Drop your CSV here</div>
            <div style={{ fontSize: "0.82rem", color: t.textMuted }}>or click to browse · CSV files only</div>
            <input ref={inputRef} type="file" accept=".csv" onChange={onFileInput} style={{ display: "none" }} />
          </div>
        )}

        {/* File loaded */}
        {hasFile && (
          <>
            {/* File info */}
            <div style={{
              background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`,
              padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: 10, marginBottom: "1.25rem",
            }}>
              <div>
                <div style={{ fontWeight: 600, color: t.text, fontSize: "0.9rem" }}>
                  <i className="bi-file-earmark-check" style={{ marginRight: 8, color: "#7A8A5C" }} />
                  {fileName}
                </div>
                <div style={{ color: t.textMuted, fontSize: "0.78rem", marginTop: 3 }}>
                  {totalRows.toLocaleString()} rows · {headers.length} columns · {mappedCount} mapped
                </div>
              </div>
              <button onClick={() => { setHeaders([]); setFile(null); setFileName(""); setResult(null); }}
                style={{
                  background: "none", border: `1px solid ${t.border}`, color: t.textMuted,
                  borderRadius: 8, padding: "5px 12px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit",
                }}>
                Change file
              </button>
            </div>

            {/* Column mapping */}
            <div style={{
              background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`,
              padding: "20px", marginBottom: "1.25rem",
            }}>
              <div style={{ fontWeight: 700, color: t.text, marginBottom: 14, fontSize: "0.9rem" }}>
                Column Mapping
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
                {TARGET_FIELDS.map(f => (
                  <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <label style={{ fontSize: "0.8rem", color: t.textMuted, width: 130, flexShrink: 0, fontWeight: 500 }}>
                      {f.label}
                      {f.required && <span style={{ color: t.accent, marginLeft: 3 }}>*</span>}
                    </label>
                    <select
                      value={mapping[f.key] ?? ""}
                      onChange={e => setMapping(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{
                        flex: 1, background: t.surfaceAlt, border: `1px solid ${t.border}`,
                        color: mapping[f.key] ? t.text : t.textFaint,
                        borderRadius: 7, padding: "5px 8px", fontSize: "0.78rem",
                        fontFamily: "inherit", cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      <option value="">— skip —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {!mapping.email && (
                <div style={{ marginTop: 12, fontSize: "0.78rem", color: "#C1573B", fontWeight: 500 }}>
                  <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 5 }} />Map the Email field to continue
                </div>
              )}
            </div>

            {/* Preview */}
            {preview.length > 0 && mapping.email && (
              <div style={{
                background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`,
                overflow: "hidden", marginBottom: "1.25rem",
              }}>
                <div style={{ padding: "12px 18px", background: t.surfaceAlt, borderBottom: `1px solid ${t.border}`, fontWeight: 600, color: t.text, fontSize: "0.82rem" }}>
                  Preview — first {preview.length} rows
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                        {TARGET_FIELDS.filter(f => mapping[f.key]).map(f => (
                          <th key={f.key} style={{ padding: "8px 14px", textAlign: "left", color: t.textMuted, fontWeight: 600, whiteSpace: "nowrap" }}>
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} style={{ borderBottom: i < preview.length - 1 ? `1px solid ${t.border}` : "none" }}>
                          {TARGET_FIELDS.filter(f => mapping[f.key]).map(f => (
                            <td key={f.key} style={{ padding: "8px 14px", color: t.text, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {row[mapping[f.key]] || <span style={{ color: t.textFaint }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div style={{
                background: result.errors.length === 0 ? "#7A8A5C18" : "#C1573B18",
                border: `1px solid ${result.errors.length === 0 ? "#7A8A5C" : "#C1573B"}`,
                borderRadius: 10, padding: "14px 18px", marginBottom: "1.25rem",
              }}>
                <div style={{ fontWeight: 700, color: result.errors.length === 0 ? "#3F5030" : "#8A3A25", marginBottom: 6 }}>
                  {result.errors.length === 0
  ? <><i className="bi bi-check-circle-fill" style={{ marginRight: 6 }} />Import complete</>
  : <><i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }} />Import finished with errors</>
}
                </div>
                <div style={{ fontSize: "0.82rem", color: t.textMuted }}>
                  {result.imported.toLocaleString()} imported
                  {result.skipped > 0 && ` · ${result.skipped.toLocaleString()} skipped (no email)`}
                </div>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: "0.78rem", color: "#C1573B", marginTop: 4 }}>{e}</div>
                ))}
              </div>
            )}

            {/* Import button */}
            <button
              onClick={handleImport}
              disabled={!canImport}
              style={{
                background: canImport ? t.accent : t.border,
                color: canImport ? "#fff" : t.textFaint,
                border: "none", borderRadius: 10, padding: "12px 28px",
                fontSize: "0.9rem", fontWeight: 700, cursor: canImport ? "pointer" : "not-allowed",
                fontFamily: "inherit", width: "100%", transition: "opacity 0.15s",
              }}
            >
              {importing ? `Importing ${totalRows.toLocaleString()} rows…` : `Import ${totalRows.toLocaleString()} contacts`}
            </button>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: "2.5rem", paddingTop: "1.25rem", borderTop: `1px solid ${t.border}`, fontSize: "0.75rem", color: t.textFaint }}>
          Ethos One · Company OS · 2026
        </div>
      </div>
    </main>
  );
}
