import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Every route below first confirms the caller is a logged-in admin, then uses
// the service-role client to do the actual work (creating/looking up auth
// users, inserting/deleting rows in public.admins).
async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }
  const { data: adminRow } = await supabase.from("admins").select("id").eq("id", user.id).maybeSingle();
  if (!adminRow) {
    return { user: null, error: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  }
  return { user, error: null as null };
}

// Looks up an existing auth user by exact email via the GoTrue admin REST
// endpoint (the supabase-js admin client has no direct "get user by email").
async function findUserIdByEmail(email: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const users = Array.isArray(json) ? json : json.users;
    const match = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    return match?.id ?? null;
  } catch {
    return null;
  }
}

// Add a new admin — either promotes an existing account (e.g. a student's
// email) or creates a brand-new login, then grants the admin role.
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { email, password, fullName } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "A password of 6+ characters is required." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: alreadyAdmin } = await admin.from("admins").select("id").eq("email", email).maybeSingle();
  if (alreadyAdmin) {
    return NextResponse.json({ error: "This email is already an admin." }, { status: 400 });
  }

  let userId = await findUserIdByEmail(email);

  if (userId) {
    // Existing account (e.g. a student, or a re-added admin) — set the
    // password given here so it can be handed to them fresh.
    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, { password });
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      return NextResponse.json({ error: createErr?.message ?? "Could not create the admin account." }, { status: 500 });
    }
    userId = created.user.id;
  }

  const { error: insertErr } = await admin
    .from("admins")
    .insert({ id: userId, email, full_name: fullName || null });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Revoke someone's admin access (removes them from public.admins only — their
// login account itself is untouched, so if they also have a student profile
// it keeps working as a normal student account).
export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { adminId } = await req.json();
  if (!adminId) return NextResponse.json({ error: "adminId is required." }, { status: 400 });
  if (adminId === guard.user!.id) {
    return NextResponse.json({ error: "You cannot remove your own admin access." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { count } = await admin.from("admins").select("id", { count: "exact", head: true });
  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: "At least one admin must remain." }, { status: 400 });
  }

  const { error } = await admin.from("admins").delete().eq("id", adminId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
