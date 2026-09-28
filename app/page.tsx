import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import TickerBanner from "@/components/TickerBanner";
import Hero from "@/components/Hero";
import CoursesSection from "@/components/CoursesSection";
import BatchesSection from "@/components/BatchesSection";
import GallerySection from "@/components/GallerySection";
import ReviewsSection from "@/components/ReviewsSection";
import Footer from "@/components/Footer";
import type { Batch, Course, Feedback, GalleryItem, HomeContent, SitePage } from "@/types";

export const revalidate = 0; // always fetch fresh data (seats, announcements)

const DEFAULT_CONTENT: HomeContent = {
  id: 1,
  hero_title: "Shape Your Future With IT HUB KOHLU",
  hero_subtitle:
    "Industry-focused admissions in Web Development, Graphic Designing, Digital Marketing & E-Commerce.",
  about_text:
    "IT HUB KOHLU Institute trains the next generation of tech professionals with hands-on, project-based learning.",
  why_choose_us_points: ["Expert Instructors", "Hands-on Projects", "Job Placement Support", "Modern Curriculum"],
  contact_phone: "+92 300 0000000",
  contact_email: "info@ithub.edu.pk",
  contact_address: "Main Boulevard, City, Pakistan",
  admission_open: true,
  logo_url: null,
  institute_name: "IT HUB Kohlu",
  developer_name: "Abdul Salam",
  help_content: "Need assistance? Contact the IT HUB KOHLU office during working hours.",
  admission_note: "",
  id_card_terms: "",
};

export default async function HomePage() {
  const supabase = createClient();

  const [{ data: content }, { data: batches }, { data: gallery }, { data: courses }, { count: rollCount }, { data: cardCount }, { data: resultCount }, { data: reviews }, { data: sitePages }] =
    await Promise.all([
      supabase.from("home_content").select("*").eq("id", 1).maybeSingle(),
      supabase.from("batches").select("*, batch_courses(course_name)").eq("is_announced", true).order("created_at", { ascending: false }),
      supabase.from("gallery").select("*").eq("is_hidden", false).order("created_at", { ascending: false }),
      supabase.from("courses").select("*").order("display_order", { ascending: true }),
      supabase.from("roll_numbers").select("*", { count: "exact", head: true }),
      supabase.rpc("id_cards_issued_count"),
      supabase.rpc("results_published_count"),
      supabase.from("feedback").select("*").eq("is_approved", true).order("created_at", { ascending: false }).limit(9),
      supabase.from("site_pages").select("*").eq("is_active", true).eq("show_in_nav", true).order("display_order", { ascending: true }),
    ]);

  const home = (content as HomeContent) ?? DEFAULT_CONTENT;
  const batchList = ((batches as any[]) ?? []).map((b) => ({
    ...b,
    course_names: Array.from(new Set([b.course_name, ...(b.batch_courses ?? []).map((c: any) => c.course_name)])),
  })) as (Batch & { course_names: string[] })[];
  const galleryList = (gallery as GalleryItem[]) ?? [];
  const courseList = (courses as Course[]) ?? [];
  const reviewList = (reviews as Feedback[]) ?? [];
  const showRollSlipLink = (rollCount ?? 0) > 0;
  const showIdCardLink = Number(cardCount ?? 0) > 0;
  const showResultsLink = Number(resultCount ?? 0) > 0;

  return (
    <main>
      <Navbar
        showRollSlipLink={showRollSlipLink}
        showIdCardLink={showIdCardLink}
        showResultsLink={showResultsLink}
        logoUrl={home.logo_url}
        instituteName={home.institute_name}
        sitePages={(sitePages as SitePage[]) ?? []}
      />
      <TickerBanner batches={batchList} />
      <Hero title={home.hero_title} subtitle={home.hero_subtitle} admissionOpen={home.admission_open} />
      <CoursesSection courses={courseList} />
      <BatchesSection batches={batchList} />
      <GallerySection images={galleryList} />
      <ReviewsSection reviews={reviewList} />
      <Footer content={home} />
    </main>
  );
}
