import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email, first_name } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUB_ID = process.env.BEEHIIV_PUBLICATION_ID;

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUB_ID) {
    return NextResponse.json({ error: "Newsletter not configured." }, { status: 500 });
  }

  const res = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${BEEHIIV_API_KEY}` },
    body: JSON.stringify({ email: email.toLowerCase().trim(), first_name, reactivate_existing: true, send_welcome_email: true }),
  });

  if (!res.ok) {
    console.error("Beehiiv subscribe error:", await res.text());
    return NextResponse.json({ error: "Could not save your subscription." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
