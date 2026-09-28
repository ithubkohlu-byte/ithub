"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateIdCardPdf } from "@/lib/pdf";
import StudentIdCard from "@/components/StudentIdCard";
import { Loader2, Search, SearchX, Zap } from "lucide-react";
import type { HomeContent } from "@/types";

// Shape of one row returned by the lookup_id_card(cnic) RPC. Only the fields
// the card is allowed to show — all captured from the student's own
// admission application, never re-typed by the admin. The row only exists
// (and only comes back) once the admin has issued a card for this student.
// issue_date / valid_until come straight off the card record; valid_until is
// auto-calculated server-side as the end date of the student's batch.
interface LookupRow {
  full_name: string;
  father_name: string;
  phone: string;
  tracking_id: string;
  student_cnic: string;
  photo_url: string | null;
  issue_date: string;
  valid_until: string | null;
}

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

export default function IdCardPage({ searchParams }: { searchParams: { cnic?: string } }) {
  const supabase = createClient();
  const [query, setQuery] = useState(searchParams.cnic ?? "");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [result, setResult] = useState<LookupRow | null>(null);
  const [home, setHome] = useState<HomeContent | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    supabase
      .from("home_content")
      .select("institute_name, logo_url, id_card_terms")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setHome(data as HomeContent | null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function runSearch(cnic: string) {
    setLoading(true);
    setNotFound(false);
    setResult(null);
    const { data } = await supabase.rpc("lookup_id_card", { p_cnic: cnic.trim() });
    const row = (data as LookupRow[] | null)?.[0] ?? null;
    setResult(row);
    setNotFound(!row);
    setLoading(false);
  }

  // Auto-search once if a CNIC was passed in via ?cnic= (the ID card's own
  // "scan to look up" QR code links here).
  useEffect(() => {
    if (searchParams.cnic) runSearch(searchParams.cnic);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    runSearch(query);
  }

  async function handleDownload() {
    if (!result) return;
    setDownloading(true);
    const [photoDataUrl, logoDataUrl] = await Promise.all([
      result.photo_url ? toDataUrl(result.photo_url) : Promise.resolve(null),
      home?.logo_url ? toDataUrl(home.logo_url) : Promise.resolve(null),
    ]);
    const doc = await generateIdCardPdf({
      student: {
        full_name: result.full_name,
        father_name: result.father_name,
        phone: result.phone,
        tracking_id: result.tracking_id,
        student_cnic: result.student_cnic,
        photo_url: result.photo_url,
      },
      issueDate: result.issue_date,
      validUntil: result.valid_until,
      photoDataUrl,
      logoDataUrl,
      instituteName: home?.institute_name,
      verifyBaseUrl: window.location.origin,
      termsText: home?.id_card_terms,
    });
    doc.save(`${result.tracking_id}-id-card.pdf`);
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
          <h1 className="mb-1 font-display text-xl font-semibold text-white">Get Your Student ID Card</h1>
          <p className="mb-5 text-sm text-slate-400">Enter your CNIC to download your ID card (only available once enrolled).</p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              className="input-field"
              placeholder="e.g. 12345-1234567-1"
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
            <p className="text-sm text-slate-400">
              No ID card found for that CNIC. Either your application isn&apos;t marked as enrolled yet, or the
              institute hasn&apos;t issued your card yet — check back later or contact the office.
            </p>
          </div>
        )}
      </div>

      {result && (
        <div className="mt-10">
          <StudentIdCard
            student={{
              full_name: result.full_name,
              father_name: result.father_name,
              phone: result.phone,
              tracking_id: result.tracking_id,
              student_cnic: result.student_cnic,
              photo_url: result.photo_url,
            }}
            issueDate={result.issue_date}
            validUntil={result.valid_until}
            instituteName={home?.institute_name}
            logoUrl={home?.logo_url}
            termsText={home?.id_card_terms}
            onDownload={handleDownload}
            downloading={downloading}
          />
        </div>
      )}
    </main>
  );
}
