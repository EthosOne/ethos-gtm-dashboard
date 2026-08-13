import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  const cleanEmail = email.toLowerCase().trim();

  const res = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${BEEHIIV_API_KEY}` },
    body: JSON.stringify({ email: cleanEmail, first_name, reactivate_existing: true, send_welcome_email: true }),
  });

  if (!res.ok) {
    console.error("Beehiiv subscribe error:", await res.text());
    return NextResponse.json({ error: "Could not save your subscription." }, { status: 500 });
  }

  const beehiivData = await res.json();
  const subscriptionId: string | null = beehiivData?.data?.id ?? null;

  // Mirror the subscription into the CRM so real inbound interest shows up in the pipeline.
  // Beehiiv stays the source of truth for subscription status — this is a best-effort mirror,
  // never blocks the subscribe response if it fails.
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing } = await supabase
      .from("contacts")
      .select("id, stage")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      const update: Record<string, unknown> = { twlr_subscriber: true, beehiiv_subscription_id: subscriptionId };
      if (existing.stage === "Cold" || existing.stage === "Closed Lost") update.stage = "Nurture";
      await supabase.from("contacts").update(update).eq("id", existing.id);
    } else {
      await supabase.from("contacts").insert({
        email: cleanEmail,
        first_name: first_name || null,
        stage: "Nurture",
        source: "TWLR Newsletter",
        twlr_subscriber: true,
        beehiiv_subscription_id: subscriptionId,
        notes: `Subscribed via TWLR landing opt-in on ${new Date().toISOString().slice(0, 10)}.`,
      });
    }
  } catch (mirrorErr) {
    console.error("CRM mirror error (non-blocking):", mirrorErr);
  }

  return NextResponse.json({ ok: true });
}
