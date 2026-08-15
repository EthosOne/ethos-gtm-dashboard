import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isClosedStage, stopInstantlyOutreach } from "../../../../utils/instantly";

export async function POST(req: NextRequest) {
  try {
    const { id, stage } = await req.json();
    if (!id || !stage) return NextResponse.json({ error: "Missing id or stage" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: updated, error } = await supabase
      .from("contacts")
      .update({ stage })
      .eq("id", id)
      .select("email, instantly_enrolled")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let instantlyStopped = 0;
    if (isClosedStage(stage) && updated?.email && updated?.instantly_enrolled) {
      const { stopped } = await stopInstantlyOutreach(updated.email);
      instantlyStopped = stopped;
      if (stopped > 0) {
        await supabase.from("contacts").update({ instantly_enrolled: false }).eq("id", id);
      }
    }

    return NextResponse.json({ ok: true, instantlyStopped });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
