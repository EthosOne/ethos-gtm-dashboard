import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.from("contacts").insert({
      email: body.email.toLowerCase().trim(),
      first_name: body.first_name ?? null,
      last_name: body.last_name ?? null,
      company: body.company ?? null,
      company_domain: body.company_domain ?? null,
      job_title: body.job_title ?? null,
      linkedin_url: body.linkedin_url ?? null,
      city: body.city ?? null,
      country: body.country ?? null,
      stage: body.stage ?? "Cold",
      twlr_subscriber: body.twlr_subscriber ?? false,
      notes: body.notes ?? null,
      source: "manual",
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, contact: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
