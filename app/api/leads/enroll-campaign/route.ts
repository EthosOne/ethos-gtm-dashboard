import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const { contact_id, campaign_id, campaign_name, email, first_name, last_name, company } =
    await req.json();

  if (!campaign_id || !email) {
    return NextResponse.json({ error: "campaign_id and email are required" }, { status: 400 });
  }

  // Enroll in Instantly
  const instantly = await fetch("https://api.instantly.ai/api/v2/leads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      campaign_id,
      email,
      first_name: first_name ?? "",
      last_name: last_name ?? "",
      company_name: company ?? "",
      skip_if_in_workspace: true,
    }),
  });

  if (!instantly.ok) {
    const err = await instantly.json().catch(() => ({}));
    return NextResponse.json(
      { error: err?.error ?? "Instantly enrollment failed" },
      { status: instantly.status }
    );
  }

  // Record enrollment in Supabase (non-blocking — don't fail the response if this errors)
  if (contact_id) {
    await supabase
      .from("contacts")
      .update({
        instantly_enrolled: true,
        instantly_campaign_id: campaign_id,
        instantly_campaign_name: campaign_name ?? null,
        outreach_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contact_id)
      .then(() => null);
  }

  return NextResponse.json({ ok: true, campaign_name });
}
