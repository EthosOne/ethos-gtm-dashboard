import { NextResponse } from "next/server";

const PUB_ID = "pub_bd48d1d0-78fe-483e-a111-c5857e35dc83";
const BASE   = "https://api.beehiiv.com/v2";

export async function GET() {
  const key = process.env.BEEHIIV_API_KEY;
  if (!key) return NextResponse.json({ error: "no key" }, { status: 500 });

  // Beehiiv's order_by=newest_first is unreliable when combined with expand[]=stats, so fetch
  // a batch and pick the true latest by publish_date ourselves instead of trusting limit=1.
  const params = new URLSearchParams({ status: "published", limit: "20", order_by: "newest_first" });
  params.append("expand[]", "stats");
  const postsRes = await fetch(
    `${BASE}/publications/${PUB_ID}/posts?${params.toString()}`,
    { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }
  );
  if (!postsRes.ok) return NextResponse.json({ unique_opens: 0, open_rate: 0, total_sent: 0, web_views: 0, post_title: "" });
  const postsData = await postsRes.json();
  const allPosts: Record<string, unknown>[] = postsData?.data ?? [];
  const post = allPosts.sort((a, b) => ((b.publish_date as number) ?? 0) - ((a.publish_date as number) ?? 0))[0];
  if (!post) return NextResponse.json({ unique_opens: 0, open_rate: 0, total_sent: 0, web_views: 0, post_title: "" });

  const stats = post.stats as Record<string, Record<string, number>> | null;
  const email = stats?.email ?? {};
  const web   = stats?.web   ?? {};

  return NextResponse.json({
    post_title:   post.title,
    unique_opens: email.unique_opens ?? 0,
    open_rate:    email.open_rate    ?? 0,
    total_sent:   email.recipients   ?? 0,
    web_views:    web.views          ?? 0,
  });
}
