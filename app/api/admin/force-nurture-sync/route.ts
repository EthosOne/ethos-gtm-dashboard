import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BEEHIIV_PUB_ID = "pub_bd48d1d0-78fe-483e-a111-c5857e35dc83";
const COLD_INSTANTLY_ID = "9cca7b1a-4867-467f-8e38-ab5f80d4440a";

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const beehiivKey = process.env.BEEHIIV_API_KEY;
  const instantlyKey = process.env.INSTANTLY_API_KEY;

  if (!beehiivKey || !instantlyKey) {
    return NextResponse.json({ error: "Missing BEEHIIV_API_KEY or INSTANTLY_API_KEY env vars" }, { status: 500 });
  }

  // Step 1: pull Beehiiv subscribers and flag genuinely engaged ones
  let flagged = 0;
  let cursor: string | null = null;
  do {
    const url: string = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions?limit=100&expand[]=stats${cursor ? `&cursor=${cursor}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${beehiivKey}` } });
    if (!res.ok) break;
    const json = await res.json();
    const subs = json.data ?? [];

    for (const sub of subs) {
      const engaged = (sub.stats?.total_unique_opened ?? 0) > 0 || (sub.stats?.total_unique_clicked ?? 0) > 0;
      if (!engaged || !sub.email) continue;
      const { data: contact } = await supabase
        .from("contacts")
        .select("id, beehiiv_engaged")
        .eq("email", sub.email)
        .maybeSingle();
      if (contact && !contact.beehiiv_engaged) {
        await supabase.from("contacts").update({ beehiiv_engaged: true }).eq("id", contact.id);
        flagged++;
      }
    }
    cursor = json.has_more ? json.next_cursor : null;
  } while (cursor);

  // Step 2: enroll newly-engaged Cold contacts into the warm Instantly campaign
  const { data: toEnroll } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name, company, company_domain")
    .eq("beehiiv_engaged", true)
    .eq("instantly_enrolled", false)
    .eq("stage", "Cold");

  let enrolled = 0;
  for (const c of toEnroll ?? []) {
    const res = await fetch("https://api.instantly.ai/api/v2/leads", {
      method: "POST",
      headers: { Authorization: `Bearer ${instantlyKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: COLD_INSTANTLY_ID,
        email: c.email,
        first_name: c.first_name,
        last_name: c.last_name,
        company_name: c.company,
        website: c.company_domain,
      }),
    });
    if (res.ok) {
      await supabase
        .from("contacts")
        .update({ instantly_enrolled: true, instantly_enrolled_at: new Date().toISOString(), stage: "Nurture" })
        .eq("id", c.id);
      enrolled++;
    }
  }

  return NextResponse.json({ ok: true, flagged, enrolled });
}
