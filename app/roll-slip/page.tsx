"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateRollSlipPdf } from "@/lib/pdf";
import RollSlipCard from "@/components/RollSlipCard";
import { Loader2, Search, SearchX, Zap } from "lucide-react";
import type { HomeContent, RollNumber, Student } from "@/types";

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function RollSlipPage() {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [result, setResult] = useState<{ student: Student; roll: RollNumber; courseName: string; batchName: string } | null>(null);
  const [home, setHome] = useState<HomeContent | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    supabase
      .from("home_content")
      .select("institute_name, logo_url")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setHome(data as HomeContent | null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotFound(false);
    setResult(null);

    const q = query.trim();

    // Anonymous visitors can't read the tables directly (RLS), so search goes
    // through a secure database function (Tracking ID, CNIC or Roll No).
    const { data, error } = await supabase.rpc("lookup_roll_slip", { p_query: q });
    const found = data as { student: Student; roll: RollNumber; course_name: string | null; batch_name: string | null } | null;

    if (error || !found) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setResult({
      student: found.student,
      roll: found.roll,
      courseName: found.course_name ?? "-",
      batchName: found.batch_name ?? "-",
    });
    setLoading(false);
  }

  async function handleDownload() {
    if (!result) return;
    setDownloading(true);
    const [photoDataUrl, logoDataUrl] = await Promise.all([
      result.student.photo_url ? toDataUrl(result.student.photo_url) : Promise.resolve(null),
      home?.logo_url ? toDataUrl(home.logo_url) : Promise.resolve(null),
    ]);
    const doc = await generateRollSlipPdf({
      student: result.student,
      rollNumber: result.roll,
      courseName: result.courseName,
      batchName: result.batchName,
      photoDataUrl,
      logoDataUrl,
      instituteName: home?.institute_name,
      verifyBaseUrl: window.location.origin,
    });
    doc.save(`${result.student.tracking_id}-roll-slip.pdf`);
    setDownloading(false);
  }

  return (
    <main className="min-h-screen px-4 py-10 md:px-6">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-display text-lg font-semibold text-white">
          {home?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={home.logo_url} alt={home?.institute_name ?? "IT HUB KOHLU"} className="h-9 w-9 rounded-lg object-contain" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon-line text-base-950">
              <Zap size={18} strokeWidth={2.5} />
            </span>
          )}
          {home?.institute_name ?? (
            <>
              IT <span className="neon-text">HUB</span>
            </>
          )}
        </Link>

        <div className="glass-card p-6">
          <h1 className="mb-1 font-display text-xl font-semibold text-white">Find your Roll No. Slip</h1>
          <p className="mb-5 text-sm text-slate-400">Enter your Tracking ID or CNIC to see your roll number and download the slip as PDF.</p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              className="input-field"
              placeholder="Tracking ID or CNIC (e.g. 12345-1234567-1)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
            />
            <button className="btn-primary !px-4" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            </button>
          </form>
        </div>

        {notFound && (
          <div className="glass-card mt-6 flex flex-col items-center gap-3 p-8 text-center">
            <SearchX className="text-slate-500" size={36} />
            <p className="text-sm text-slate-400">No roll number found for that search.</p>
          </div>
        )}
      </div>

      {result && (
        <div className="mt-10">
          <RollSlipCard
            student={result.student}
            rollNumber={result.roll}
            courseName={result.courseName}
            batchName={result.batchName}
            instituteName={home?.institute_name}
            logoUrl={home?.logo_url}
            onDownload={handleDownload}
            downloading={downloading}
          />
        </div>
      )}
    </main>
  );
}
