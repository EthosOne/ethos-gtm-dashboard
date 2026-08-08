import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const { email } = await request.json();
  if (!email) return NextResponse.json({ message: "Email required" }, { status: 400 });

  const { error } = await adminSupabase.auth.admin.inviteUserByEmail(email);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ message: `Invite sent to ${email}` });
}
