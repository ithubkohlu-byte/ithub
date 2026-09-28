"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateResultPdf } from "@/lib/pdf";
import { Download, GraduationCap, Loader2, Search, SearchX, Zap } from "lucide-react";
import type { HomeContent } from "@/types";

interface Found {
  student: { full_name: string; father_name: string; tracking_id: string; student_cnic: string; photo_url: string | null };
  course_name: string | null;
  batch_name: string | null;
  roll_no: string | null;
  results: { id: string; title: string; result_status: string; marks_obtained: number | null; marks_total: number | null; remarks: string | null; created_at: string }[];
}

const BADGE: Record<string, string> = {
  pass: "bg-emerald-500/15 text-emerald-300",
  merit: "bg-emerald-500/15 text-emerald-300",
  fail: "bg-red-500/15 text-red-300",
  waitlist: "bg-amber-500/15 text-amber-300",
  pending: "bg-slate-500/20 text-slate-300",
};

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((res) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function ResultPage() {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [home, setHome] = useState<HomeContent | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    supabase.from("home_content").select("institute_name, logo_url").eq("id", 1).maybeSingle().then(({ data }) => setHome(data as HomeContent | null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotFound(false);
    setFound(null);
    const { data, error } = await supabase.rpc("lookup_result", { p_query: query.trim() });
    const f = data as Found | null;
    if (error || !f || !f.student) setNotFound(true);
    else setFound(f);
    setLoading(false);
  }

  async function download() {
    if (!found) return;
    setDownloading(true);
    const [photoDataUrl, logoDataUrl] = await Promise.all([
      found.student.photo_url ? toDataUrl(found.student.photo_url) : Promise.resolve(null),
      home?.logo_url ? toDataUrl(home.logo_url) : Promise.resolve(null),
    ]);
    const doc = await generateResultPdf({
      student: found.student,
      courseName: found.course_name,
      batchName: found.batch_name,
      rollNo: found.roll_no,
      results: found.results,
      photoDataUrl,
      logoDataUrl,
      instituteName: home?.institute_name,
    });
    doc.save(`${found.student.tracking_id}-result.pdf`);
    setDownloading(false);
  }

  return (
    <main className="min-h-screen px-4 py-10 md:px-6">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-display text-lg font-semibold text-white">
          {home?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={home.logo_url} alt="" className="h-9 w-9 rounded-lg object-contain" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon-line text-base-950"><Zap size={18} strokeWidth={2.5} /></span>
          )}
          {home?.institute_name ?? "IT HUB Kohlu"}
        </Link>

        <div className="glass-card p-6">
          <h1 className="mb-1 flex items-center gap-2 font-display text-xl font-semibold text-white"><GraduationCap size={20} /> Check your Result</h1>
          <p className="mb-5 text-sm text-slate-400">Enter your Tracking ID or CNIC to see your result and download it as PDF.</p>
          <form onSubmit={search} className="flex gap-2">
            <input className="input-field" placeholder="Tracking ID or CNIC" value={query} onChange={(e) => setQuery(e.target.value)} required />
            <button className="btn-primary !px-4" disabled={loading}>{loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}</button>
          </form>
        </div>

        {notFound && (
          <div className="glass-card mt-6 flex flex-col items-center gap-3 p-8 text-center">
            <SearchX className="text-slate-500" size={36} />
            <p className="text-sm text-slate-400">No published result found for that Tracking ID / CNIC.</p>
          </div>
        )}

        {found && (
          <div className="glass-card mt-6 p-6">
            <div className="mb-4 flex items-center gap-4">
              {found.student.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={found.student.photo_url} alt="" className="h-16 w-16 rounded-full border border-white/10 object-cover" />
              )}
              <div>
                <h2 className="font-display text-lg font-semibold text-white">{found.student.full_name}</h2>
                <p className="text-xs text-slate-400">S/O {found.student.father_name} · {found.student.tracking_id}</p>
                <p className="text-xs text-slate-500">{[found.course_name, found.batch_name, found.roll_no && `Roll ${found.roll_no}`].filter(Boolean).join(" · ")}</p>
              </div>
            </div>

            {found.results.length === 0 && <p className="text-sm text-slate-400">No result has been published for this student yet.</p>}
            <div className="space-y-3">
              {found.results.map((r) => (
                <div key={r.id} className="rounded-lg border border-white/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-100">{r.title}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${BADGE[r.result_status] ?? BADGE.pending}`}>{r.result_status}</span>
                  </div>
                  {r.marks_obtained != null && (
                    <p className="mt-1 text-sm text-slate-300">
                      Marks: {r.marks_obtained}{r.marks_total != null ? ` / ${r.marks_total}` : ""}
                    </p>
                  )}
                  {r.remarks && <p className="mt-1 text-xs text-slate-400">{r.remarks}</p>}
                </div>
              ))}
            </div>

            {found.results.length > 0 && (
              <button onClick={download} disabled={downloading} className="btn-primary mt-5 w-full">
                <Download size={16} /> {downloading ? "Preparing..." : "Download Result as PDF"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
