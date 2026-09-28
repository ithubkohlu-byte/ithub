"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateAdmissionLetter, generateRollSlipPdf } from "@/lib/pdf";
import RollSlipCard from "@/components/RollSlipCard";
import { BadgeCheck, Download, Loader2, ShieldX, Zap } from "lucide-react";
import type { RollNumber, Student } from "@/types";

// Everything verify_record() returns — enough to rebuild the whole admission
// letter / roll no. slip, not just a short confirmation.
interface VerifyRow {
  full_name: string;
  tracking_id: string;
  application_status: string;
  father_name: string | null;
  student_cnic: string | null;
  dob: string | null;
  gender: string | null;
  city: string | null;
  address: string | null;
  matric_board: string | null;
  matric_year: string | null;
  matric_percentage: number | null;
  fsc_board: string | null;
  fsc_group: string | null;
  fsc_percentage: number | null;
  photo_url: string | null;
  course_name: string | null;
  batch_name: string | null;
  roll_no: string | null;
  test_type: string | null;
  exam_center: string | null;
  exam_date: string | null;
  exam_time: string | null;
  reporting_time: string | null;
  roll_note: string | null;
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

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { tid?: string; roll?: string };
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerifyRow | null>(null);
  const [instituteName, setInstituteName] = useState("IT HUB Kohlu");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [admissionNote, setAdmissionNote] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBuilding, setPdfBuilding] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: home }, rpc] = await Promise.all([
        supabase.from("home_content").select("institute_name, logo_url, admission_note").eq("id", 1).maybeSingle(),
        searchParams.tid
          ? supabase.rpc("verify_record", { p_tracking_id: searchParams.tid })
          : Promise.resolve({ data: null }),
      ]);
      if (home) {
        setInstituteName((home as any).institute_name ?? "IT HUB Kohlu");
        setLogoUrl((home as any).logo_url ?? null);
        setAdmissionNote((home as any).admission_note ?? null);
      }
      const rows = (rpc as any)?.data as VerifyRow[] | null;
      setResult(rows && rows.length > 0 ? rows[0] : null);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const genuine = !!result && (!searchParams.roll || result.roll_no === searchParams.roll);
  // A roll-slip QR includes &roll=..., an admission-letter QR does not.
  const isRollSlip = genuine && !!searchParams.roll;
  const [downloadingRoll, setDownloadingRoll] = useState(false);

  async function handleRollDownload() {
    if (!result) return;
    setDownloadingRoll(true);
    try {
      const [photoDataUrl, logoDataUrl] = await Promise.all([
        result.photo_url ? toDataUrl(result.photo_url) : Promise.resolve(null),
        logoUrl ? toDataUrl(logoUrl) : Promise.resolve(null),
      ]);
      const doc = await generateRollSlipPdf({
        student: {
          tracking_id: result.tracking_id,
          full_name: result.full_name,
          father_name: result.father_name ?? "",
          student_cnic: result.student_cnic ?? "",
          photo_url: result.photo_url,
        },
        rollNumber: {
          roll_no: result.roll_no ?? "-",
          test_type: result.test_type ?? "Entry Test",
          exam_center: result.exam_center ?? "",
          exam_date: result.exam_date ?? "",
          exam_time: result.exam_time ?? "",
          reporting_time: result.reporting_time,
          note: result.roll_note,
        } as unknown as RollNumber,
        courseName: result.course_name ?? "-",
        batchName: result.batch_name ?? "-",
        photoDataUrl,
        logoDataUrl,
        instituteName,
        verifyBaseUrl: typeof window !== "undefined" ? window.location.origin : "",
      });
      doc.save(`${result.tracking_id}-roll-number-slip.pdf`);
    } finally {
      setDownloadingRoll(false);
    }
  }

  // Once we know this is a genuine admission-letter record, rebuild the exact
  // same PDF that was issued (same layout, same data) so scanning the QR
  // shows the whole document again, not just a short confirmation.
  useEffect(() => {
    if (!genuine || isRollSlip || !result) return;
    let cancelled = false;
    (async () => {
      setPdfBuilding(true);
      const [photoDataUrl, logoDataUrl] = await Promise.all([
        result.photo_url ? toDataUrl(result.photo_url) : Promise.resolve(null),
        logoUrl ? toDataUrl(logoUrl) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      const studentLike = {
        tracking_id: result.tracking_id,
        full_name: result.full_name,
        father_name: result.father_name ?? "",
        dob: result.dob ?? "",
        gender: result.gender ?? "",
        student_cnic: result.student_cnic ?? "",
        city: result.city ?? "",
        address: result.address ?? "",
        matric_board: result.matric_board ?? "",
        matric_year: result.matric_year ?? "",
        matric_percentage: result.matric_percentage ?? 0,
        fsc_board: result.fsc_board ?? "",
        fsc_group: result.fsc_group ?? "",
        fsc_percentage: result.fsc_percentage ?? 0,
        photo_url: result.photo_url,
      } as unknown as Student;

      const doc = await generateAdmissionLetter({
        student: studentLike,
        courseName: result.course_name ?? "-",
        batchName: result.batch_name ?? "-",
        photoDataUrl,
        logoDataUrl,
        instituteName,
        verifyBaseUrl: typeof window !== "undefined" ? window.location.origin : "",
        note: admissionNote,
      });
      if (!cancelled) {
        setPdfUrl(doc.output("bloburl") as unknown as string);
        setPdfBuilding(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [genuine, isRollSlip, result, instituteName, logoUrl, admissionNote]);

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 font-display text-lg font-semibold text-white">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={instituteName} className="h-9 w-9 rounded-lg object-contain" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon-line text-base-950">
            <Zap size={18} strokeWidth={2.5} />
          </span>
        )}
        {instituteName}
      </Link>

      <div className="glass-card w-full max-w-md p-8 text-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="animate-spin" size={28} />
            <p className="text-sm">Verifying...</p>
          </div>
        ) : !searchParams.tid ? (
          <p className="text-sm text-slate-400">No tracking ID was provided to verify.</p>
        ) : genuine ? (
          <div>
            <BadgeCheck className="mx-auto mb-3 text-emerald-400" size={48} />
            <h1 className="mb-1 font-display text-xl font-semibold text-emerald-300">Genuine Record</h1>
            <p className="text-sm text-slate-400">
              This is a real, system-issued document from {instituteName}. The full {isRollSlip ? "roll no. slip" : "admission letter"} is shown below —
              compare it with the paper copy to confirm nothing has been altered.
            </p>
          </div>
        ) : (
          <div>
            <ShieldX className="mx-auto mb-3 text-red-400" size={48} />
            <h1 className="mb-1 font-display text-xl font-semibold text-red-300">Not Verified</h1>
            <p className="text-sm text-slate-400">
              This does not match any record at {instituteName}. It may be fake, altered, or the tracking ID is
              incorrect.
            </p>
          </div>
        )}
      </div>

      {genuine && isRollSlip && result && (
        <div className="mt-8 w-full">
          <RollSlipCard
            student={
              {
                tracking_id: result.tracking_id,
                full_name: result.full_name,
                father_name: result.father_name ?? "",
                student_cnic: result.student_cnic ?? "",
                photo_url: result.photo_url,
              } as unknown as Student
            }
            rollNumber={
              {
                roll_no: result.roll_no ?? "-",
                test_type: result.test_type ?? "Entry Test",
                exam_center: result.exam_center ?? "",
                exam_date: result.exam_date ?? "",
                exam_time: result.exam_time ?? "",
                reporting_time: result.reporting_time,
                note: result.roll_note,
              } as unknown as RollNumber
            }
            courseName={result.course_name ?? "-"}
            batchName={result.batch_name ?? "-"}
            instituteName={instituteName}
            logoUrl={logoUrl}
            onDownload={handleRollDownload}
            downloading={downloadingRoll}
          />
        </div>
      )}

      {genuine && !isRollSlip && (
        <div className="mt-8 w-full max-w-3xl">
          {pdfBuilding && !pdfUrl ? (
            <div className="glass-card flex flex-col items-center gap-3 p-10 text-slate-400">
              <Loader2 className="animate-spin" size={28} />
              <p className="text-sm">Rebuilding the admission letter...</p>
            </div>
          ) : pdfUrl ? (
            <div className="glass-card overflow-hidden p-0">
              <iframe src={pdfUrl} title="Admission Letter" className="h-[80vh] w-full" />
              <div className="flex justify-center border-t border-white/10 p-4">
                <a href={pdfUrl} download={`${result?.tracking_id}-admission-letter.pdf`} className="btn-outline flex items-center gap-2">
                  <Download size={16} /> Download PDF
                </a>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
