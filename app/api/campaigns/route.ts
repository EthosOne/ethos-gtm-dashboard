import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://api.instantly.ai/api/v2/campaigns?limit=100", {
      headers: { Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) return NextResponse.json({ error: "Instantly API error" }, { status: 502 });

    const data = await res.json();
    const all = data.items ?? [];

    // Exclude bulk GDPR campaigns and test campaigns — those don't enroll contacts one by one
    const relevant = all
      .filter((c: { name: string; id: string; status: number }) =>
        !c.name.startsWith("TWLR — GDPR") && !c.name.startsWith("TEST")
      )
      .map((c: { id: string; name: string; status: number }) => ({
        id: c.id,
        name: c.name,
        active: c.status === 1,
      }));

    return NextResponse.json({ campaigns: relevant });
  } catch {
    return NextResponse.json({ error: "Unreachable" }, { status: 500 });
  }
}
