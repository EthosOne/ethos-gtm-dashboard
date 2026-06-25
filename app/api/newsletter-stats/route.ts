import { NextResponse } from "next/server";

const PUB_ID = "pub_bd48d1d0-78fe-483e-a111-c5857e35dc83";
const BASE   = "https://api.beehiiv.com/v2";

export async function GET() {
  const key = process.env.BEEHIIV_API_KEY;
  if (!key) return NextResponse.json({ error: "no key" }, { status: 500 });

  const params = new URLSearchParams({ status: "published", limit: "1", order_by: "newest_first" });
  params.append("expand[]", "stats");
  const url = `${BASE}/publications/${PUB_ID}/posts?${params.toString()}`;
  const postsRes = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
  const rawText = await postsRes.text();
  if (postsRes.status !== 200) return NextResponse.json({ error: "beehiiv_error", status: postsRes.status, body: rawText.slice(0, 300) }, { status: 500 });
  const postsData = JSON.parse(rawText);
  const post = postsData?.data?.[0];
  if (!post) return NextResponse.json({ error: "no_post", raw: rawText.slice(0, 300) });

  const email = post?.stats?.email ?? {};
  const web   = post?.stats?.web   ?? {};

  return NextResponse.json({
    post_title:   post.title,
    unique_opens: email.unique_opens ?? 0,
    open_rate:    email.open_rate    ?? 0,
    total_sent:   email.recipients   ?? 0,
    web_views:    web.views          ?? 0,
  });
}
