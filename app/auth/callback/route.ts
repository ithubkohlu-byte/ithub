import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google / Facebook / GitHub redirect back here with a `code` after the
// student approves the sign-in on the provider's own site.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    const user = data.user;

    if (user) {
      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      // First time this provider account has signed in here: no students
      // row yet, so send them to pick a username before anything else.
      if (!existing) {
        return NextResponse.redirect(`${origin}/apply?step=username`);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
