import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { id, beehiiv_subscription_id } = await req.json();

  if (typeof id !== "number" || typeof beehiiv_subscription_id !== "string" || !beehiiv_subscription_id) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUB_ID = process.env.BEEHIIV_PUBLICATION_ID;

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUB_ID) {
    return NextResponse.json({ error: "Newsletter not configured." }, { status: 500 });
  }

  const beehiivRes = await fetch(
    `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions/${beehiiv_subscription_id}`,
    { headers: { Authorization: `Bearer ${BEEHIIV_API_KEY}` } }
  );

  if (!beehiivRes.ok) {
    // Beehiiv unreachable or subscription vanished — don't touch local state, just report unknown.
    return NextResponse.json({ active: null });
  }

  const beehiivData = await beehiivRes.json();
  const status: string | undefined = beehiivData?.data?.status;
  const active = status === "active";
  const unsubscribedOn: string | null = beehiivData?.data?.unsubscribed_on ?? null;

  if (!active) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase
      .from("contacts")
      .update({ twlr_subscriber: false, twlr_unsubscribed_at: unsubscribedOn ?? new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({ active, status, unsubscribed_on: unsubscribedOn });
}
