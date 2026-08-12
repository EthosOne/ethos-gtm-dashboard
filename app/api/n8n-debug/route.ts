import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const start = Date.now();
    const loginRes = await fetch(`${process.env.N8N_ADMIN_URL}/rest/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailOrLdapLoginId: process.env.N8N_ADMIN_USER,
        password: process.env.N8N_ADMIN_PASS,
      }),
      next: { revalidate: 0 },
    });
    const body = await loginRes.text();
    return NextResponse.json({
      url: `${process.env.N8N_ADMIN_URL}/rest/login`,
      status: loginRes.status,
      ok: loginRes.ok,
      body: body.slice(0, 500),
      elapsedMs: Date.now() - start,
    });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : String(e),
      cause: e instanceof Error && e.cause ? String(e.cause) : null,
    });
  }
}
