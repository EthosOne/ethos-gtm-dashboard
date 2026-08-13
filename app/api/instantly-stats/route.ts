import { NextResponse } from "next/server";

// TWLR GDPR cold outreach — one campaign per country, same body/sequence
const COLD_CAMPAIGN_IDS = [
  "8d460ebf-0930-4793-8dd5-006665efcfb9", // USA
  "f6911f54-a1fe-4cbb-ad16-2ef94e72964b", // UK
  "d7c2653c-10bb-4e8a-a0ec-cb7d3c4ce88f", // Australia
  "5c47c8fd-9f58-4949-857b-76d2d91ee2d0", // Canada
];
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
  const campaigns = data.filter((c) => COLD_CAMPAIGN_IDS.includes(c.campaign_id as string));
  if (campaigns.length === 0) return NextResponse.json(empty);

  const sum = (field: string) =>
    campaigns.reduce((acc, c) => acc + Number(c[field] ?? 0), 0);

  return NextResponse.json({
    sent: sum("emails_sent_count"),
    replies: sum("reply_count"),
    clicks: sum("link_click_count"),
    bounced: sum("bounced_count"),
    leads: sum("leads_count"),
    contacted: sum("contacted_count"),
  });
}
