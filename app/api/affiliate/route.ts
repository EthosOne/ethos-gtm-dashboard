import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { first_name, last_name, email, how_to_promote } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (!first_name || typeof first_name !== "string") {
    return NextResponse.json({ error: "First name is required." }, { status: 400 });
  }

  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }

  const res = await fetch(`${SB_URL}/rest/v1/contacts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Prefer": "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      email: email.toLowerCase().trim(),
      first_name: first_name.trim(),
      last_name: (last_name ?? "").trim() || null,
      source: "affiliate",
      stage: "Affiliate",
      notes: how_to_promote?.trim() || null,
    }),
  });

  if (!res.ok) {
    console.error("Supabase affiliate error:", await res.text());
    return NextResponse.json({ error: "Could not save your application." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
