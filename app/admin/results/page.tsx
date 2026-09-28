"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Papa from "papaparse";
import { UploadCloud, Download, Eye, EyeOff, Trash2, FileSpreadsheet } from "lucide-react";
import StudentPicker, { useStudents, findStudentByRef } from "@/components/admin/StudentPicker";
import { cnicDigits } from "@/lib/cnic";

interface ResultRow {
  tracking_id: string;
  cnic?: string;
  title: string;
  result_status: string;
  marks_obtained?: string;
  marks_total?: string;
  remarks?: string;
}

const EMPTY: ResultRow = { tracking_id: "", title: "", result_status: "pending", marks_obtained: "", marks_total: "", remarks: "" };
const STATUS_OPTIONS = ["pending", "pass", "fail", "merit", "waitlist"];

export default function AdminResultsPage() {
  const supabase = createClient();
  const [manual, setManual] = useState<ResultRow>(EMPTY);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);
  const [bulkLog, setBulkLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [enrolledOnly, setEnrolledOnly] = useState(true);
  const { students, loading: studentsLoading } = useStudents(enrolledOnly);

  async function load() {
    const { data } = await supabase
      .from("results")
      .select("*, students(full_name, tracking_id, student_cnic)")
      .order("created_at", { ascending: false });
    setList(data ?? []);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fileUrl(path: string) {
    const { data } = await supabase.storage.from("result_files").createSignedUrl(path, 60 * 10);
    return data?.signedUrl ?? null;
  }

  async function assignOne(row: ResultRow, file?: File | null): Promise<string> {
    const ref = (row.tracking_id || row.cnic || "").trim();
    if (!ref) return "❌ row skipped: tracking_id or cnic is required";
    // Match by Tracking ID or CNIC (any format: with or without dashes/spaces).
    const student = findStudentByRef(students, row.tracking_id || "") ?? findStudentByRef(students, row.cnic || "") ?? findStudentByRef(students, ref);
    if (!student) {
      return `❌ ${ref}: student not found${enrolledOnly ? " among enrolled students (untick 'Enrolled students only' to include everyone)" : ""}`;
    }

    const { data: enrollment } = await supabase.from("enrollments").select("id").eq("student_id", student.id).maybeSingle();

    let file_path: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      file_path = `${student.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("result_files").upload(file_path, file, { upsert: true });
      if (upErr) return `❌ ${ref}: file upload failed — ${upErr.message}`;
    }

    const { error } = await supabase.from("results").insert({
      student_id: student.id,
      enrollment_id: enrollment?.id ?? null,
      title: row.title || "Result",
      result_status: row.result_status || "pending",
      marks_obtained: row.marks_obtained ? Number(row.marks_obtained) : null,
      marks_total: row.marks_total ? Number(row.marks_total) : null,
      remarks: row.remarks || null,
      file_path,
      is_published: true,
    });
    return error ? `❌ ${ref}: ${error.message}` : `✅ ${ref} — ${row.title || "Result"} uploaded`;
  }

  async function handleManualAssign() {
    if ((!manual.tracking_id && !manual.cnic) || !manual.title) return setMsg("Select a student and enter a title.");
    setBusy(true);
    setMsg(null);
    const result = await assignOne(manual, manualFile);
    setBusy(false);
    setMsg(result);
    if (result.startsWith("✅")) {
      setManual(EMPTY);
      setManualFile(null);
      load();
    }
  }

  function handleCsvUpload(file: File) {
    Papa.parse<ResultRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setBusy(true);
        const logs: string[] = [];
        let skipped = 0;
        for (const row of results.data) {
          if (!row.tracking_id && !row.cnic) continue;
          if (!row.title || !row.title.trim()) {
            skipped++;
            continue;
          }
          logs.push(await assignOne(row));
        }
        if (skipped > 0) logs.push(`ℹ️ ${skipped} row(s) skipped because the title column was empty`);
        setBulkLog(logs);
        setBusy(false);
        load();
      },
    });
  }

  // Downloads a CSV that already contains every listed student's Tracking ID and CNIC,
  // so admin only has to fill title / status / marks and upload it back.
  function downloadTemplate() {
    const rows = students.map((s) => ({
      tracking_id: s.tracking_id,
      cnic: s.student_cnic ?? "",
      student_name: s.full_name,
      title: "",
      result_status: "pending",
      marks_obtained: "",
      marks_total: "",
      remarks: "",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "results-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function togglePublish(r: any) {
    await supabase.from("results").update({ is_published: !r.is_published }).eq("id", r.id);
    load();
  }

  async function deleteResult(r: any) {
    if (!confirm(`Delete this result for ${r.students?.full_name}?`)) return;
    await supabase.from("results").delete().eq("id", r.id);
    load();
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-white">Results</h1>
      <p className="mb-6 text-sm text-slate-400">
        Upload a student&apos;s test/exam/merit result — with an optional mark sheet file. Unpublish a result to hide it from the
        student without deleting it.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Manual assign */}
        <div className="glass-card p-6">
          <h2 className="mb-4 font-semibold text-white">Upload One Result</h2>
          {msg && <p className="mb-3 text-sm text-cyan-300">{msg}</p>}
          <div className="space-y-3">
            <StudentPicker
              students={students}
              loading={studentsLoading}
              enrolledOnly={enrolledOnly}
              onToggleEnrolledOnly={setEnrolledOnly}
              selectedTrackingId={manual.tracking_id}
              onSelect={(s) => setManual({ ...manual, tracking_id: s?.tracking_id ?? "" })}
            />
            <input className="input-field" placeholder="Title (e.g. Entry Test Result)" value={manual.title}
              onChange={(e) => setManual({ ...manual, title: e.target.value })} />
            <select className="input-field" value={manual.result_status}
              onChange={(e) => setManual({ ...manual, result_status: e.target.value })}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field" type="number" placeholder="Marks Obtained" value={manual.marks_obtained}
                onChange={(e) => setManual({ ...manual, marks_obtained: e.target.value })} />
              <input className="input-field" type="number" placeholder="Marks Total" value={manual.marks_total}
                onChange={(e) => setManual({ ...manual, marks_total: e.target.value })} />
            </div>
            <textarea className="input-field h-20" placeholder="Remarks (optional)" value={manual.remarks}
              onChange={(e) => setManual({ ...manual, remarks: e.target.value })} />
            <label className="btn-outline flex w-full cursor-pointer justify-center !py-2.5 text-xs">
              <UploadCloud size={15} /> {manualFile ? manualFile.name : "Attach Result File (optional)"}
              <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden"
                onChange={(e) => setManualFile(e.target.files?.[0] ?? null)} />
            </label>
            <button onClick={handleManualAssign} disabled={busy} className="btn-primary w-full !py-2">
              {busy ? "Uploading..." : "Upload Result"}
            </button>
          </div>
        </div>

        {/* Bulk CSV */}
        <div className="glass-card p-6">
          <h2 className="mb-4 font-semibold text-white">Bulk Upload (CSV)</h2>
          <p className="mb-3 text-xs text-slate-400">
            Download the CSV above — every student's Tracking ID and CNIC are already filled in. Just fill <code className="text-cyan-300">title, result_status, marks_obtained, marks_total, remarks</code> and upload it back (rows with an empty title are skipped). CNIC works with or without dashes.
            <br />
            (result_status: pending / pass / fail / merit / waitlist — files can&apos;t be attached via CSV, upload those one at a time)
          </p>
          <button type="button" onClick={downloadTemplate} disabled={studentsLoading || students.length === 0}
            className="btn-outline mb-3 flex w-full justify-center !py-3">
            <FileSpreadsheet size={16} /> Download CSV with all {enrolledOnly ? "enrolled " : ""}students ({students.length})
          </button>
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

      <input className="input-field mt-6" placeholder="Search results by student name, Tracking ID, CNIC or title" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="glass-card mt-3 overflow-x-auto scroll-thin p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Tracking ID</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Marks</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.filter((r) => {
              if (!q) return true;
              const t = q.toLowerCase();
              const d = cnicDigits(q);
              return (
                [r.students?.full_name, r.students?.tracking_id, r.title].some((f: string) => f?.toLowerCase().includes(t)) ||
                (d.length > 0 && cnicDigits(r.students?.student_cnic).includes(d))
              );
            }).map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-slate-200">{r.students?.full_name}</td>
                <td className="px-4 py-3 text-slate-400">{r.students?.tracking_id}</td>
                <td className="px-4 py-3 text-slate-300">{r.title}</td>
                <td className="px-4 py-3 text-cyan-300">{r.result_status}</td>
                <td className="px-4 py-3 text-slate-400">
                  {r.marks_obtained != null && r.marks_total != null ? `${r.marks_obtained}/${r.marks_total}` : "-"}
                </td>
                <td className="px-4 py-3">
                  {r.file_path ? (
                    <button
                      onClick={async () => {
                        const url = await fileUrl(r.file_path);
                        if (url) window.open(url, "_blank");
                      }}
                      className="text-cyan-300 hover:text-cyan-200"
                    >
                      <Download size={14} />
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => togglePublish(r)} className="text-slate-400 hover:text-cyan-300">
                    {r.is_published ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteResult(r)} className="text-slate-500 hover:text-red-400">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">No results uploaded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
