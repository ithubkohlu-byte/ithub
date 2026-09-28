import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";
import TickerBanner from "@/components/TickerBanner";
import Hero from "@/components/Hero";
import CoursesSection from "@/components/CoursesSection";
import BatchesSection from "@/components/BatchesSection";
import GallerySection from "@/components/GallerySection";
import ReviewsSection from "@/components/ReviewsSection";
import Footer from "@/components/Footer";
import type { Batch, Course, GalleryItem, SitePage, DashboardTab, DocumentRow, Enrollment, Feedback, HomeContent, Result, RollNumber, Student } from "@/types";

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
    { data: batches },
    { data: gallery },
    { data: courses },
    { data: reviews },
    { data: sitePages },
  ] = await Promise.all([
    supabase.from("students").select("*").eq("id", user.id).single(),
    supabase.from("enrollments").select("*, batches(*)").eq("student_id", user.id).maybeSingle(),
    supabase.from("documents").select("*").eq("student_id", user.id),
    supabase.from("roll_numbers").select("*").eq("student_id", user.id).maybeSingle(),
    supabase.from("home_content").select("*").eq("id", 1).maybeSingle(),
    supabase.from("dashboard_tabs").select("*").eq("is_active", true).order("display_order", { ascending: true }),
    supabase.from("feedback").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
    supabase.from("results").select("*").eq("student_id", user.id).eq("is_published", true).order("created_at", { ascending: false }),
    supabase.from("batches").select("*, batch_courses(course_name)").eq("is_announced", true).order("created_at", { ascending: false }),
    supabase.from("gallery").select("*").eq("is_hidden", false).order("created_at", { ascending: false }),
    supabase.from("courses").select("*").order("display_order", { ascending: true }),
    supabase.from("feedback").select("*").eq("is_approved", true).order("created_at", { ascending: false }).limit(9),
    supabase.from("site_pages").select("*").eq("is_active", true).order("display_order", { ascending: true }),
  ]);

  const batchList = ((batches as any[]) ?? []).map((b) => ({
    ...b,
    course_names: Array.from(new Set([b.course_name, ...(b.batch_courses ?? []).map((c: any) => c.course_name)])),
  })) as (Batch & { course_names: string[] })[];
  const home = content as HomeContent | null;

  // The whole public website, shown inside the student's dashboard "Home" tab.
  const siteContent = (
    <>
      <TickerBanner batches={batchList} />
      <Hero
        title={home?.hero_title ?? "Shape Your Future With IT HUB KOHLU"}
        subtitle={home?.hero_subtitle ?? ""}
        admissionOpen={home?.admission_open ?? true}
      />
      <CoursesSection courses={(courses as Course[]) ?? []} />
      <BatchesSection batches={batchList} />
      <GallerySection images={(gallery as GalleryItem[]) ?? []} />
      <ReviewsSection reviews={(reviews as Feedback[]) ?? []} />
      {home && <Footer content={home} />}
    </>
  );

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
      siteContent={siteContent}
      sitePages={((sitePages as SitePage[]) ?? []).map((p) => ({ id: p.id, title: p.title, content: p.content }))}
    />
  );
}
