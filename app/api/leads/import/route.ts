import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (c === "," && !inQ) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  const headers = parseCSVLine(lines[0]);
  return lines
    .slice(1)
    .filter(l => l.trim())
    .map(line => {
      const vals = parseCSVLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = (vals[i] ?? "").trim(); });
      return row;
    });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawMapping = formData.get("mapping") as string | null;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (!rawMapping) return NextResponse.json({ error: "No mapping" }, { status: 400 });

    const mapping = JSON.parse(rawMapping) as Record<string, string>;
    const csvText = await file.text();
    const rows = parseCSV(csvText);

    const contacts = rows
      .map(row => {
        const c: Record<string, string | null> = {
          source: "csv_import",
          stage: "Cold",
        };
        for (const [field, csvCol] of Object.entries(mapping)) {
          if (csvCol && row[csvCol] !== undefined) {
            c[field] = row[csvCol]?.trim() || null;
          }
        }
        if (c.email) c.email = (c.email as string).toLowerCase().trim();
        return c;
      })
      .filter(c => c.email && (c.email as string).includes("@"));

    if (contacts.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: rows.length,
        errors: ["No valid emails found — check the Email column mapping"],
      });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const BATCH = 500;
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < contacts.length; i += BATCH) {
      const batch = contacts.slice(i, i + BATCH);
      const { error } = await supabase
        .from("contacts")
        .upsert(batch, { onConflict: "email", ignoreDuplicates: false });

      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
      } else {
        imported += batch.length;
      }
    }

    return NextResponse.json({ imported, skipped: rows.length - contacts.length, errors });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
