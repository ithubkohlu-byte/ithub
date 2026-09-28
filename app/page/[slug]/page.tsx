import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import type { HomeContent, SitePage } from "@/types";
import { ArrowLeft } from "lucide-react";

export const revalidate = 0;

export default async function SitePagePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const [{ data: page }, { data: content }, { data: navPages }] = await Promise.all([
    supabase.from("site_pages").select("*").eq("slug", params.slug).eq("is_active", true).maybeSingle(),
    supabase.from("home_content").select("*").eq("id", 1).maybeSingle(),
    supabase.from("site_pages").select("*").eq("is_active", true).eq("show_in_nav", true).order("display_order", { ascending: true }),
  ]);

  if (!page) notFound();

  const home = content as HomeContent | null;

  return (
    <main>
      <Navbar
        showRollSlipLink={false}
        logoUrl={home?.logo_url}
        instituteName={home?.institute_name}
        sitePages={(navPages as SitePage[]) ?? []}
      />
      <section className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
          <ArrowLeft size={15} /> Back to Home
        </Link>
        <div className="glass-card p-6 md:p-8">
          <h1 className="font-display text-2xl font-semibold text-white md:text-3xl">{(page as SitePage).title}</h1>
          <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-300">{(page as SitePage).content}</p>
        </div>
      </section>
    </main>
  );
}
