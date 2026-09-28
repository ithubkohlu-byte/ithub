"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cnicDigits, sameCnic } from "@/lib/cnic";
import { Search, X } from "lucide-react";

export interface PickerStudent {
  id: string;
  full_name: string;
  tracking_id: string;
  student_cnic: string | null;
  application_status: string;
}

// Loads every student (or only the enrolled ones) with their Tracking ID and CNIC,
// so admin never has to type them by hand.
export function useStudents(enrolledOnly: boolean) {
  const [students, setStudents] = useState<PickerStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const all: PickerStudent[] = [];
      const PAGE = 1000;
      for (let from = 0; from < 20000; from += PAGE) {
        let q = supabase
          .from("students")
          .select("id, full_name, tracking_id, student_cnic, application_status");
        if (enrolledOnly) q = q.eq("application_status", "enrolled");
        const { data } = await q.order("created_at", { ascending: false }).range(from, from + PAGE - 1);
        const rows = (data as PickerStudent[]) ?? [];
        all.push(...rows);
        if (rows.length < PAGE) break;
      }
      if (alive) {
        setStudents(all);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enrolledOnly]);

  return { students, loading };
}

// Finds a student from a Tracking ID or a CNIC (any format).
export function findStudentByRef(students: PickerStudent[], ref: string): PickerStudent | undefined {
  const r = ref.trim();
  if (!r) return undefined;
  return (
    students.find((s) => s.tracking_id?.toLowerCase() === r.toLowerCase()) ??
    students.find((s) => sameCnic(s.student_cnic, r))
  );
}

interface Props {
  students: PickerStudent[];
  loading: boolean;
  enrolledOnly: boolean;
  onToggleEnrolledOnly: (v: boolean) => void;
  selectedTrackingId: string;
  onSelect: (s: PickerStudent | null) => void;
}

export default function StudentPicker({ students, loading, enrolledOnly, onToggleEnrolledOnly, selectedTrackingId, onSelect }: Props) {
  const [q, setQ] = useState("");
  const selected = useMemo(
    () => students.find((s) => s.tracking_id === selectedTrackingId) ?? null,
    [students, selectedTrackingId]
  );

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = cnicDigits(q);
    const list = !term
      ? students
      : students.filter(
          (s) =>
            s.full_name?.toLowerCase().includes(term) ||
            s.tracking_id?.toLowerCase().includes(term) ||
            (digits.length > 0 && cnicDigits(s.student_cnic).includes(digits))
        );
    return list.slice(0, 40);
  }, [students, q]);

  if (selected) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-3">
        <div className="text-sm">
          <p className="font-medium text-white">{selected.full_name}</p>
          <p className="text-xs text-slate-400">Tracking ID: {selected.tracking_id}</p>
          <p className="text-xs text-slate-400">CNIC: {selected.student_cnic || "-"}</p>
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-slate-400 hover:text-white" aria-label="Change student">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input-field !pl-9"
          placeholder={loading ? "Loading students..." : "Search student by name, Tracking ID or CNIC"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input type="checkbox" checked={enrolledOnly} onChange={(e) => onToggleEnrolledOnly(e.target.checked)} />
        Enrolled students only ({students.length} shown in list)
      </label>
      <div className="max-h-52 overflow-y-auto rounded-lg border border-white/10 scroll-thin">
        {matches.length === 0 && (
          <p className="px-3 py-3 text-xs text-slate-500">{loading ? "Loading..." : "No student found."}</p>
        )}
        {matches.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              onSelect(s);
              setQ("");
            }}
            className="block w-full border-b border-white/5 px-3 py-2 text-left text-sm last:border-0 hover:bg-white/5"
          >
            <span className="text-slate-100">{s.full_name}</span>
            <span className="ml-2 text-xs text-slate-500">
              {s.tracking_id} · {s.student_cnic || "no CNIC"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
