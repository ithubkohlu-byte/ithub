import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { studentId, newPassword } = await req.json();
  if (!studentId || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "studentId and a password of 6+ characters are required." }, { status: 400 });
  }

  // Verify the caller is a logged-in admin before using the service role key
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: adminRow } = await supabase.from("admins").select("id").eq("id", user.id).maybeSingle();
  if (!adminRow) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(studentId, { password: newPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
