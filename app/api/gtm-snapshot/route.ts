import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INSTANTLY_BASE = "https://api.instantly.ai/api/v2";

const SME_CAMPAIGN_IDS = [
  "1d22158f-7de8-4607-951a-d1303fc1e106", // SME LT - UK/EU
  "aa0f54ce-b6c9-4aa6-a45d-63e921fd6049", // SME HT - UK/EU
  "2d7536d7-96f7-49ba-8f80-68e65a84e775", // SME LT - US/CA
  "037122e6-f5d8-4bd6-b73c-c19c5b223709", // SME HT - US/CA
  "20fa243d-9b34-4e40-a014-5359e5964ef3", // SME HT - AU/NZ
  "687a20ae-fb8c-4bf8-a950-3cfecf9075d0", // SME LT - AU/NZ
];
const WARM_CAMPAIGN_ID = "9cca7b1a-4867-467f-8e38-ab5f80d4440a"; // Beehiiv - Warm

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const instantlyKey = process.env.INSTANTLY_API_KEY;
  const supabase = supabaseAdmin();

  // Instantly campaign analytics (all campaigns, one call)
  let campaigns: Record<string, unknown>[] = [];
  if (instantlyKey) {
    const res = await fetch(`${INSTANTLY_BASE}/campaigns/analytics`, {
      headers: { Authorization: `Bearer ${instantlyKey}` },
      cache: "no-store",
    });
    if (res.ok) campaigns = await res.json();
  }
  const byId = (id: string) => campaigns.find((c) => c.campaign_id === id);
  const sumFields = (ids: string[], field: string) =>
    ids.reduce((acc, id) => acc + Number(byId(id)?.[field] ?? 0), 0);

  const smeSent = sumFields(SME_CAMPAIGN_IDS, "emails_sent_count");
  const smeReplies = sumFields(SME_CAMPAIGN_IDS, "reply_count");
  const warmSent = Number(byId(WARM_CAMPAIGN_ID)?.emails_sent_count ?? 0);
  const warmReplies = Number(byId(WARM_CAMPAIGN_ID)?.reply_count ?? 0);

  const totalSent = campaigns.reduce((acc, c) => acc + Number(c.emails_sent_count ?? 0), 0);
  const totalBounced = campaigns.reduce((acc, c) => acc + Number(c.bounced_count ?? 0), 0);
  const avgBounceRate = totalSent > 0 ? +(totalBounced / totalSent * 100).toFixed(2) : 0;

  // Instantly sending accounts (active count)
  let activeSendAccounts = 0;
  if (instantlyKey) {
    const res = await fetch(`${INSTANTLY_BASE}/accounts?limit=100`, {
      headers: { Authorization: `Bearer ${instantlyKey}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const items: Record<string, unknown>[] = data.items ?? [];
      activeSendAccounts = items.filter((a) => a.status === 1).length;
    }
  }

  // TWLR subscriber count — from Supabase (same source as /analytics page),
  // not the raw Beehiiv API: its expand[]=stats field name isn't confirmed
  // and a wrong guess would silently report 0 forever instead of failing loud.
  const { count: twlrSubscribers } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("twlr_subscriber", true);

  // LinkedIn connections sent — tagged in contacts.notes (see reference_linkedin_outreach_notes_schema.md)
  const { count: linkedinConnections } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .ilike("notes", "%linkedin_connect_sent%");

  const today = new Date().toISOString().slice(0, 10);

  // Delta vs yesterday's snapshot, for twlr_new
  const { data: prev } = await supabase
    .from("gtm_daily_snapshots")
    .select("twlr_subscribers")
    .lt("snapshot_date", today)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const twlrNew = prev?.twlr_subscribers != null
    ? Math.max(0, (twlrSubscribers ?? 0) - prev.twlr_subscribers)
    : 0;

  const row = {
    snapshot_date: today,
    twlr_subscribers: twlrSubscribers ?? 0,
    twlr_new: twlrNew,
    sme_sent: smeSent,
    sme_replies: smeReplies,
    warm_sent: warmSent,
    warm_replies: warmReplies,
    linkedin_connections: linkedinConnections ?? 0,
    active_send_accounts: activeSendAccounts,
    avg_bounce_rate: avgBounceRate,
  };

  const { error } = await supabase
    .from("gtm_daily_snapshots")
    .upsert(row, { onConflict: "snapshot_date" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, row });
}
