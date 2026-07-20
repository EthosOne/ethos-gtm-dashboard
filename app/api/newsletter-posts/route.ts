import { NextResponse } from "next/server";

const PUB_ID = "pub_bd48d1d0-78fe-483e-a111-c5857e35dc83";
const BASE   = "https://api.beehiiv.com/v2";

export async function GET() {
  const key = process.env.BEEHIIV_API_KEY;
  if (!key) return NextResponse.json([], { status: 500 });

  const params = new URLSearchParams({ status: "published", limit: "20", order_by: "newest_first" });
  params.append("expand[]", "stats");

  const res = await fetch(
    `${BASE}/publications/${PUB_ID}/posts?${params.toString()}`,
    { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json([]);

  const { data } = await res.json();
  if (!data) return NextResponse.json([]);

  const posts = (data as Record<string, unknown>[]).map((p) => {
    const email = (p.stats as Record<string, Record<string, number>> | null)?.email ?? {};
    const web   = (p.stats as Record<string, Record<string, number>> | null)?.web   ?? {};
    return {
      id:           p.id,
      title:        p.title,
      web_url:      p.web_url ?? null,
      publish_date: (p.publish_date as number | null) ?? null,
      total_sent:   email.recipients   ?? 0,
      unique_opens: email.unique_opens ?? 0,
      open_rate:    email.open_rate    ?? 0,
      web_views:    web.views          ?? 0,
    };
  });

  // Beehiiv's order_by=newest_first is unreliable when combined with expand[]=stats
  // (confirmed: without expand it sorts correctly, with it it doesn't) — sort here instead
  // of trusting the API's order.
  posts.sort((a, b) => (b.publish_date ?? 0) - (a.publish_date ?? 0));

  return NextResponse.json(posts);
}
