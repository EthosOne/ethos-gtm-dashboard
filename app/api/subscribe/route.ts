import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email, first_name } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Upsert by email — if contact exists, mark as twlr_subscriber
  const { error } = await supabase
    .from("contacts")
    .upsert(
      {
        email: email.toLowerCase().trim(),
        first_name: first_name ?? null,
        stage: "Cold",
        twlr_subscriber: true,
      },
      { onConflict: "email", ignoreDuplicates: false }
    );

  if (error) {
    console.error("Subscribe error:", error.message);
    return NextResponse.json({ error: "Could not save your subscription." }, { status: 500 });
  }

  // Beehiiv integration — add when Joshua provides API key + publication ID
  // const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
  // const BEEHIIV_PUB_ID = process.env.BEEHIIV_PUBLICATION_ID;
  // if (BEEHIIV_API_KEY && BEEHIIV_PUB_ID) {
  //   await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json", Authorization: `Bearer ${BEEHIIV_API_KEY}` },
  //     body: JSON.stringify({ email, first_name, reactivate_existing: true, send_welcome_email: true }),
  //   });
  // }

  return NextResponse.json({ ok: true });
}
