import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const REMINDER_FIELDS = ["reminder_thankyou_sent_at", "reminder_offer_sent_at", "reminder_bigco_sent_at"] as const;
type ReminderField = (typeof REMINDER_FIELDS)[number];

export async function POST(req: NextRequest) {
  const { id, field, value } = await req.json();

  if (!id || !REMINDER_FIELDS.includes(field as ReminderField)) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("contacts")
    .update({ [field]: value ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
