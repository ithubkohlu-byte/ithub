"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Printer, SearchX, Loader2, GraduationCap } from "lucide-react";
import { formatDate } from "@/lib/utils";

function RollSlipInner() {
  const supabase = createClient();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("id") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (params.get("id")) handleSearch(params.get("id")!);
  }, []);

  async function handleSearch(q?: string) {
    const value = (q ?? query).trim();
    if (!value) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);

    const { data: students } = await supabase
      .from("students")
      .select("*")
      .or(`tracking_id.eq.${value},cnic.eq.${value}`);

    let studentId: string | null = students?.[0]?.id || null;
    let student = students?.[0] || null;

    let rollQuery = supabase.from("roll_numbers").select("*, students(*), enrollments(*, batches(*))");
    let rollData;
    if (studentId) {
      const { data } = await rollQuery.eq("student_id", studentId).maybeSingle();
      rollData = data;
    } else {
      const { data } = await rollQuery.eq("roll_no", value).maybeSingle();
      rollData = data;
      student = data?.students || null;
    }

    setLoading(false);
    if (!rollData) return setNotFound(true);
    setResult({ ...rollData, student });
  }

  return (
    <div className="min-h-screen bg-base px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10 no-print">
          <span className="h-14 w-14 rounded-xl bg-neon-gradient flex items-center justify-center shadow-glow mb-4 mx-auto">
            <GraduationCap size={24} className="text-white" />
          </span>
          <h1 className="text-3xl font-bold">Roll Number Slip</h1>
          <p className="text-white/50 mt-2">Search by Tracking ID, CNIC, or Roll No</p>
        </div>

        <div className="flex gap-3 mb-10 no-print">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter Tracking ID / CNIC / Roll No"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent"
          />
          <button onClick={() => handleSearch()} disabled={loading} className="btn-neon text-white px-6 rounded-lg font-medium flex items-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
          </button>
        </div>

        {notFound && (
          <div className="glass rounded-2xl p-10 text-center">
            <SearchX className="mx-auto mb-4 text-white/30" size={40} />
            <p className="text-white/60">No roll number slip found for this search.</p>
          </div>
        )}

        {result && (
          <div className="glass rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6 no-print">
              <h2 className="text-gradient font-bold text-xl">IT HUB Institute</h2>
              <button onClick={() => window.print()} className="glass px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <Printer size={16} /> Print
              </button>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 items-center">
              <div className="text-center">
                <div className="h-28 w-28 rounded-xl bg-white/10 mx-auto" />
                <p className="text-xs text-white/40 mt-2">Photo</p>
              </div>
              <div className="sm:col-span-2 space-y-2 text-sm">
                <Row label="Name" value={result.student?.full_name} />
                <Row label="Father Name" value={result.student?.father_name} />
                <Row label="CNIC" value={result.student?.cnic} />
                <Row label="Course" value={result.enrollments?.course_name} />
                <Row label="Batch" value={result.enrollments?.batches?.batch_name} />
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10 grid sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <p className="text-white/40 text-xs">Roll No</p>
                <p className="text-3xl font-extrabold text-gradient">{result.roll_no}</p>
              </div>
              <Row label="Exam Center" value={result.exam_center} />
              <Row label="Date & Time" value={`${formatDate(result.exam_date)} ${result.exam_time || ""}`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-white/40 text-xs">{label}</p>
      <p className="font-medium">{value || "-"}</p>
    </div>
  );
}

export default function RollSlipPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base" />}>
      <RollSlipInner />
    </Suspense>
  );
}
