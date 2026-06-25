import { NextResponse } from "next/server";

const PUB_ID = "pub_bd48d1d0-78fe-483e-a111-c5857e35dc83";
const BASE   = "https://api.beehiiv.com/v2";

export async function GET() {
  const key = process.env.BEEHIIV_API_KEY;
  if (!key) return NextResponse.json({ error: "no key" }, { status: 500 });

  const postsRes = await fetch(
    `${BASE}/publications/${PUB_ID}/posts?status=published&limit=1&order_by=newest_first`,
    { headers: { Authorization: `Bearer ${key}` }, next: { revalidate: 300 } }
  );
  const postsData = await postsRes.json();
  const post = postsData?.data?.[0];
  if (!post) return NextResponse.json({ unique_opens: 0, open_rate: 0, total_sent: 0, web_views: 0, post_title: "" });

  const statsRes = await fetch(
    `${BASE}/publications/${PUB_ID}/posts/${post.id}/stats`,
    { headers: { Authorization: `Bearer ${key}` }, next: { revalidate: 300 } }
  );
  const statsData = await statsRes.json();
  const email = statsData?.data?.email ?? {};
  const web   = statsData?.data?.web   ?? {};

  return NextResponse.json({
    post_title:   post.title,
    unique_opens: email.total_unique_opened ?? 0,
    open_rate:    email.open_rate           ?? 0,
    total_sent:   email.total_sent          ?? 0,
    web_views:    web.total_web_viewed      ?? 0,
  });
}
