import { NextResponse } from "next/server";

const GDPR_CAMPAIGN_ID = "8d460ebf-0930-4793-8dd5-006665efcfb9"; // TWLR — GDPR 2500 Cold Outreach
const BASE = "https://api.instantly.ai/api/v2";

export async function GET() {
  const key = process.env.INSTANTLY_API_KEY;
  const empty = { sent: 0, replies: 0, clicks: 0, bounced: 0, leads: 0, contacted: 0 };
  if (!key) return NextResponse.json(empty);

  const res = await fetch(`${BASE}/campaigns/analytics`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json(empty);

  const data: Record<string, unknown>[] = await res.json();
  const campaign = data.find((c) => c.campaign_id === GDPR_CAMPAIGN_ID);
  if (!campaign) return NextResponse.json(empty);

  return NextResponse.json({
    sent: campaign.emails_sent_count ?? 0,
    replies: campaign.reply_count ?? 0,
    clicks: campaign.link_click_count ?? 0,
    bounced: campaign.bounced_count ?? 0,
    leads: campaign.leads_count ?? 0,
    contacted: campaign.contacted_count ?? 0,
  });
}
