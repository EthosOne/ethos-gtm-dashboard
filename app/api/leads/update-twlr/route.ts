import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { id, twlr_subscriber } = await req.json();

  if (typeof id !== "number" || typeof twlr_subscriber !== "boolean") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (!twlr_subscriber) {
    const { error } = await supabase.from("contacts").update({ twlr_subscriber: false }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { data: contact, error: fetchError } = await supabase
    .from("contacts")
    .select("email, first_name")
    .eq("id", id)
    .single();

  if (fetchError || !contact?.email) {
    return NextResponse.json({ error: "Contact not found or missing email." }, { status: 404 });
  }

  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUB_ID = process.env.BEEHIIV_PUBLICATION_ID;

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUB_ID) {
    return NextResponse.json({ error: "Newsletter not configured." }, { status: 500 });
  }

  const beehiivRes = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${BEEHIIV_API_KEY}` },
    body: JSON.stringify({
      email: contact.email.toLowerCase().trim(),
      first_name: contact.first_name,
      reactivate_existing: true,
      send_welcome_email: true,
      utm_source: "crm",
    }),
  });

  if (!beehiivRes.ok) {
    console.error("Beehiiv subscribe error:", await beehiivRes.text());
    return NextResponse.json({ error: "Could not subscribe this contact in Beehiiv." }, { status: 500 });
  }

  const beehiivData = await beehiivRes.json();
  const subscriptionId: string | null = beehiivData?.data?.id ?? null;

  const { error } = await supabase
    .from("contacts")
    .update({ twlr_subscriber: true, beehiiv_subscription_id: subscriptionId, twlr_unsubscribed_at: null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, beehiiv_subscription_id: subscriptionId });
}
