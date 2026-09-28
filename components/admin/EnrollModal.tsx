"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, X } from "lucide-react";
import type { Course } from "@/types";

interface BatchRow {
  id: string;
  batch_name: string;
  status: string;
  seats_total: number;
  seats_filled: number;
  course_names: string[];
}

export default function EnrollModal({
  studentId,
  studentName,
  onClose,
  onDone,
}: {
  studentId: string;
  studentName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const supabase = createClient();
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [course, setCourse] = useState("");
  const [batchId, setBatchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: b }, { data: c }, { data: e }] = await Promise.all([
        supabase.from("batches").select("*, batch_courses(course_name)"),
        supabase.from("courses").select("*").order("display_order", { ascending: true }),
        supabase.from("enrollments").select("course_name,batch_id").eq("student_id", studentId).maybeSingle(),
      ]);
      setBatches(
        ((b as any[]) ?? []).map((x) => ({
          ...x,
          course_names: Array.from(new Set([x.course_name, ...(x.batch_courses ?? []).map((y: any) => y.course_name)])),
        }))
      );
      setCourses((c as Course[]) ?? []);
      if (e) {
        setCourse(e.course_name);
        setBatchId(e.batch_id);
      }
      setLoading(false);
    })();
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const batchOptions = useMemo(() => batches.filter((b) => !course || b.course_names.includes(course)), [batches, course]);

  async function save() {
    if (!course || !batchId) return setError("Select a course and a batch.");
    setBusy(true);
    setError(null);
    const { error: e1 } = await supabase
      .from("enrollments")
      .upsert({ student_id: studentId, batch_id: batchId, course_name: course }, { onConflict: "student_id" });
    if (e1) {
      setBusy(false);
      return setError(e1.message);
    }
    const { error: e2 } = await supabase.from("students").update({ application_status: "enrolled" }).eq("id", studentId);
    setBusy(false);
    if (e2) return setError(e2.message);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-white">Enroll {studentName}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">Course</label>
              <select className="input-field" value={course} onChange={(e) => { setCourse(e.target.value); setBatchId(""); }}>
                <option value="">— Select course —</option>
                {courses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Batch</label>
              <select className="input-field" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value="">— Select batch —</option>
                {batchOptions.map((b) => (
                  <option key={b.id} value={b.id}>{b.batch_name} ({b.seats_filled}/{b.seats_total} seats)</option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button onClick={save} disabled={busy} className="btn-primary w-full !py-2.5">
              {busy ? <Loader2 size={16} className="animate-spin" /> : "Enroll Student"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
