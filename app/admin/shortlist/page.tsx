"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Papa from "papaparse";
import { UploadCloud, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import EnrollModal from "@/components/admin/EnrollModal";

interface ShortlistRow {
  tracking_id: string;
  shortlisted: string; // "yes" / "no" / "true" / "false" / "1" / "0"
  remarks?: string;
}

function toBool(v: string | undefined) {
  return ["yes", "true", "1", "shortlisted", "selected"].includes((v ?? "").trim().toLowerCase());
}

export default function AdminShortlistPage() {
  const supabase = createClient();
  const [manual, setManual] = useState<ShortlistRow>({ tracking_id: "", shortlisted: "yes", remarks: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);
  const [bulkLog, setBulkLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ id: string; full_name: string; tracking_id: string; application_status: string }[]>([]);
  const [pick, setPick] = useState("");
  const [enrollOpen, setEnrollOpen] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("enrollments")
      .select("*, students(full_name, tracking_id), batches(batch_name, seats_total, seats_filled)")
      .order("enrolled_at", { ascending: false });
    setList(data ?? []);
    const { data: st } = await supabase
      .from("students")
      .select("id, full_name, tracking_id, application_status")
      .neq("application_status", "enrolled")
      .order("created_at", { ascending: false });
    setPending((st as any[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function applyOne(row: ShortlistRow): Promise<string> {
    const { data: student, error: sErr } = await supabase
      .from("students")
      .select("id")
      .eq("tracking_id", row.tracking_id)
      .maybeSingle();
    if (sErr || !student) return `❌ ${row.tracking_id}: student not found`;

    const { error } = await supabase
      .from("enrollments")
      .update({ is_shortlisted: toBool(row.shortlisted), shortlist_remarks: row.remarks || null })
      .eq("student_id", student.id);
    return error ? `❌ ${row.tracking_id}: ${error.message}` : `✅ ${row.tracking_id} — ${toBool(row.shortlisted) ? "Shortlisted" : "Not shortlisted"}`;
  }

  async function handleManual() {
    if (!manual.tracking_id) return setMsg("Tracking ID is required.");
    setBusy(true);
    setMsg(null);
    const result = await applyOne(manual);
    setBusy(false);
    setMsg(result);
    if (result.startsWith("✅")) {
      setManual({ tracking_id: "", shortlisted: "yes", remarks: "" });
      load();
    }
  }

  function handleCsvUpload(file: File) {
    Papa.parse<ShortlistRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setBusy(true);
        const logs: string[] = [];
        for (const row of results.data) {
          if (!row.tracking_id) continue;
          logs.push(await applyOne(row));
        }
        setBulkLog(logs);
        setBusy(false);
        load();
      },
    });
  }

  async function toggleRow(e: any) {
    await supabase.from("enrollments").update({ is_shortlisted: !e.is_shortlisted }).eq("id", e.id);
    load();
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-white">Shortlist</h1>
      <p className="mb-6 text-sm text-slate-400">
        Applications are always accepted, even once a batch&apos;s seats are full. Once you&apos;re ready to finalize who&apos;s
        actually in, mark them here — one at a time or in bulk via CSV.
      </p>

      <div className="glass-card mb-6 p-6">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-white"><UserPlus size={17} /> Enroll a Student</h2>
        <p className="mb-4 text-xs text-slate-400">
          Pick any student who isn&apos;t enrolled yet, choose their course and batch, and enroll them directly.
          They then appear in the list below and in Students / ID Cards as Enrolled.
        </p>
        <div className="flex flex-wrap gap-2">
          <select className="input-field min-w-[240px] flex-1" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">— Select student ({pending.length} not enrolled) —</option>
            {pending.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name} ({s.tracking_id}) — {s.application_status.replace("_", " ")}</option>
            ))}
          </select>
          <button onClick={() => setEnrollOpen(true)} disabled={!pick} className="btn-primary !py-2">Enroll Student</button>
        </div>
      </div>
      {enrollOpen && pick && (
        <EnrollModal
          studentId={pick}
          studentName={pending.find((p) => p.id === pick)?.full_name ?? "student"}
          onClose={() => setEnrollOpen(false)}
          onDone={() => { setEnrollOpen(false); setPick(""); load(); }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h2 className="mb-4 font-semibold text-white">Manual</h2>
          {msg && <p className="mb-3 text-sm text-cyan-300">{msg}</p>}
          <div className="space-y-3">
            <input className="input-field" placeholder="Tracking ID (e.g. ITHUB-2026-1001)" value={manual.tracking_id}
              onChange={(e) => setManual({ ...manual, tracking_id: e.target.value })} />
            <select className="input-field" value={manual.shortlisted}
              onChange={(e) => setManual({ ...manual, shortlisted: e.target.value })}>
              <option value="yes">Shortlisted</option>
              <option value="no">Not Shortlisted</option>
            </select>
            <textarea className="input-field h-20" placeholder="Remarks (optional)" value={manual.remarks}
              onChange={(e) => setManual({ ...manual, remarks: e.target.value })} />
            <button onClick={handleManual} disabled={busy} className="btn-primary w-full !py-2">
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="mb-4 font-semibold text-white">Bulk Upload (CSV)</h2>
          <p className="mb-3 text-xs text-slate-400">
            Columns: <code className="text-cyan-300">tracking_id, shortlisted, remarks</code>
            <br />
            (shortlisted: yes / no)
          </p>
          <label className="btn-outline flex w-full cursor-pointer justify-center !py-3">
            <UploadCloud size={16} /> Choose CSV File
            <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files && handleCsvUpload(e.target.files[0])} />
          </label>
          {bulkLog.length > 0 && (
            <div className="mt-4 max-h-48 space-y-1 overflow-y-auto scroll-thin text-xs">
              {bulkLog.map((l, i) => <p key={i} className="text-slate-300">{l}</p>)}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card mt-6 overflow-x-auto scroll-thin p-0">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Tracking ID</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Seats</th>
              <th className="px-4 py-3">Shortlisted</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-slate-200">{e.students?.full_name}</td>
                <td className="px-4 py-3 text-slate-400">{e.students?.tracking_id}</td>
                <td className="px-4 py-3 text-slate-300">{e.course_name}</td>
                <td className="px-4 py-3 text-slate-400">{e.batches?.batch_name}</td>
                <td className="px-4 py-3 text-slate-400">
                  {e.batches ? `${e.batches.seats_filled}/${e.batches.seats_total}` : "-"}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleRow(e)} className={e.is_shortlisted ? "text-emerald-400" : "text-slate-500"}>
                    {e.is_shortlisted ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No applications yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
