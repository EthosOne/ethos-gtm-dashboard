import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function checkInstantly() {
  try {
    const res = await fetch("https://api.instantly.ai/api/v2/accounts?limit=5", {
      headers: { Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) return { status: "error", label: "API error" };
    const data = await res.json();
    const account = data.items?.[0];
    if (!account) return { status: "error", label: "No account found" };
    const warmupEnabled = account.warmup_status === 1;
    const accountActive = account.status === 1;  // status=2 means paused
    const score = account.stat_warmup_score ?? 0;
    const running = warmupEnabled && accountActive;
    const toolStatus = !warmupEnabled ? "error"
                     : !accountActive ? "warn"
                     : score >= 80    ? "ok"
                     :                  "warn";
    return {
      status: toolStatus,
      label: !warmupEnabled ? "Warmup disabled"
           : !accountActive ? `Warmup paused · ${score}% health`
           : `Warmup active · ${score}% health`,
      score,
      warmupActive: running,
      url: "https://app.instantly.ai/app/accounts",
    };
  } catch {
    return { status: "error", label: "Unreachable" };
  }
}

async function checkN8N() {
  try {
    const loginRes = await fetch(`${process.env.N8N_ADMIN_URL}/rest/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailOrLdapLoginId: process.env.N8N_ADMIN_USER,
        password: process.env.N8N_ADMIN_PASS,
      }),
      next: { revalidate: 0 },
    });
    if (!loginRes.ok) return { status: "error", label: "Login failed" };

    const cookies = loginRes.headers.get("set-cookie") ?? "";
    const workflowIds = [
      "gmfh0oTYaT4jXE97",
      "RmxntutiNfob29SN",
      "5MR96fVoYvMt4dcx",
      "Dpnie0YYDMMkArAw",
      "oQlPpzhyqvinvXSp",
      "ILJEeZxOC2UudG4z",
      "7eU6Y4ppzRQTFFVJ",
    ];

    const results = await Promise.all(
      workflowIds.map(async (id) => {
        const r = await fetch(`${process.env.N8N_ADMIN_URL}/rest/workflows/${id}`, {
          headers: { Cookie: cookies },
          next: { revalidate: 0 },
        });
        if (!r.ok) return { id, active: false };
        const d = await r.json();
        return { id, active: d.data?.active ?? false, name: d.data?.name ?? id };
      })
    );

    const active = results.filter((w) => w.active).length;
    const total = results.length;
    return {
      status: active === total ? "ok" : active > 0 ? "warn" : "error",
      label: `${active}/${total} workflows active`,
      workflows: results,
      url: process.env.N8N_ADMIN_URL ?? "#",
    };
  } catch {
    return { status: "error", label: "Unreachable" };
  }
}

async function checkBeehiiv() {
  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/posts?limit=1&order_by=publish_date&direction=desc`,
      {
        headers: { Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}` },
        next: { revalidate: 0 },
      }
    );
    if (!res.ok) return { status: "error", label: "API error" };
    const data = await res.json();
    const last = data.data?.[0];
    if (!last) return { status: "warn", label: "No posts found" };
    const publishedAt = (last.publish_at ?? last.created_at) * 1000;
    const daysSince = Math.floor((Date.now() - publishedAt) / (1000 * 60 * 60 * 24));
    const date = new Date(publishedAt).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
    const stale = daysSince > 14;
    return {
      status: stale ? "warn" : "ok",
      label: stale
        ? `No issue in ${daysSince}d — last: ${last.subject_line?.slice(0, 25) ?? "—"}`
        : `Last: ${last.subject_line?.slice(0, 35) ?? "—"}`,
      date,
      url: last.web_url ?? `https://app.beehiiv.com/publications/${process.env.BEEHIIV_PUBLICATION_ID}/posts`,
    };
  } catch {
    return { status: "error", label: "Unreachable" };
  }
}

export async function GET() {
  const [instantly, n8n, beehiiv] = await Promise.all([
    checkInstantly(),
    checkN8N(),
    checkBeehiiv(),
  ]);

  return NextResponse.json(
    { instantly, n8n, beehiiv, ts: Date.now() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
