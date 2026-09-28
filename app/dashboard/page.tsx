import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";
import type { DashboardTab, DocumentRow, Enrollment, Feedback, HomeContent, Result, RollNumber, Student } from "@/types";

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: student },
    { data: enrollment },
    { data: documents },
    { data: rollNumber },
    { data: content },
    { data: tabs },
    { data: feedback },
    { data: results },
  ] = await Promise.all([
    supabase.from("students").select("*").eq("id", user.id).single(),
    supabase.from("enrollments").select("*, batches(*)").eq("student_id", user.id).maybeSingle(),
    supabase.from("documents").select("*").eq("student_id", user.id),
    supabase.from("roll_numbers").select("*").eq("student_id", user.id).maybeSingle(),
    supabase.from("home_content").select("*").eq("id", 1).maybeSingle(),
    supabase.from("dashboard_tabs").select("*").eq("is_active", true).order("display_order", { ascending: true }),
    supabase.from("feedback").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
    supabase.from("results").select("*").eq("student_id", user.id).eq("is_published", true).order("created_at", { ascending: false }),
  ]);

  return (
    <DashboardClient
      student={student as Student}
      enrollment={enrollment as (Enrollment & { batches: any }) | null}
      documents={(documents as DocumentRow[]) ?? []}
      rollNumber={rollNumber as RollNumber | null}
      homeContent={content as HomeContent | null}
      dashboardTabs={(tabs as DashboardTab[]) ?? []}
      feedback={(feedback as Feedback[]) ?? []}
      results={(results as Result[]) ?? []}
    />
  );
}
