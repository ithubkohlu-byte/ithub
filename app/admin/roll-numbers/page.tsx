"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Papa from "papaparse";
import { UploadCloud } from "lucide-react";
import { TEST_TYPE_PRESETS } from "@/types";

interface RollRow {
  roll_no: string;
  tracking_id: string;
  test_type: string;
  exam_center: string;
  exam_date: string;
  exam_time: string;
  reporting_time?: string;
  note?: string;
}

const EMPTY_ROW: RollRow = {
  roll_no: "",
  tracking_id: "",
  test_type: TEST_TYPE_PRESETS[0],
  exam_center: "",
  exam_date: "",
  exam_time: "",
  reporting_time: "",
  note: "",
};

const PRESET_SET: readonly string[] = TEST_TYPE_PRESETS;

// A <select> of preset test types plus a "Custom..." option that reveals a
// free-text input beneath it.
function TestTypeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const custom = !!value && !PRESET_SET.includes(value);
  return (
    <div className="space-y-2">
      <select
        className="input-field"
        value={custom ? "__custom__" : value || TEST_TYPE_PRESETS[0]}
        onChange={(e) => onChange(e.target.value === "__custom__" ? "" : e.target.value)}
      >
        {TEST_TYPE_PRESETS.map((t) => <option key={t} value={t}>{t}</option>)}
        <option value="__custom__">Custom...</option>
      </select>
      {custom && (
        <input className="input-field" placeholder="Enter test type" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export default function AdminRollNumbersPage() {
  const supabase = createClient();
  const [manual, setManual] = useState<RollRow>({ ...EMPTY_ROW });
  const [drafts, setDrafts] = useState<Record<string, Partial<RollRow>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);
  const [bulkLog, setBulkLog] = useState<string[]>([]);

  async function load() {
    const { data } = await supabase
      .from("roll_numbers")
      .select("*, students(full_name, tracking_id)")
      .order("created_at", { ascending: false });
    setList(data ?? []);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function assignOne(row: RollRow): Promise<string> {
    const { data: student, error: sErr } = await supabase
      .from("students")
      .select("id")
      .eq("tracking_id", row.tracking_id)
      .maybeSingle();
    if (sErr || !student) return `❌ ${row.tracking_id}: student not found`;

    const { data: enrollment } = await supabase.from("enrollments").select("id").eq("student_id", student.id).maybeSingle();

    const { error } = await supabase.from("roll_numbers").upsert(
      {
        student_id: student.id,
        enrollment_id: enrollment?.id ?? null,
        roll_no: row.roll_no,
        test_type: row.test_type || TEST_TYPE_PRESETS[0],
        exam_center: row.exam_center,
        exam_date: row.exam_date || null,
        exam_time: row.exam_time,
        reporting_time: row.reporting_time || null,
        note: row.note || null,
      },
      { onConflict: "roll_no" }
    );
    return error ? `❌ ${row.tracking_id}: ${error.message}` : `✅ ${row.tracking_id} → Roll ${row.roll_no}`;
  }

  async function handleManualAssign() {
    setMsg(null);
    const result = await assignOne(manual);
    setMsg(result);
    if (result.startsWith("✅")) {
      setManual({ ...EMPTY_ROW });
      load();
    }
  }

  // Saves one field on an existing roll number row (used for the inline-editable
  // Test Type / Reporting Time / Note columns in the list below).
  async function updateField(rollId: string, field: keyof RollRow, value: string) {
    setSavingId(rollId);
    await supabase.from("roll_numbers").update({ [field]: value.trim() === "" ? null : value }).eq("id", rollId);
    setSavingId(null);
    load();
  }

  function handleCsvUpload(file: File) {
    Papa.parse<RollRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const logs: string[] = [];
        for (const row of results.data) {
          if (!row.roll_no || !row.tracking_id) continue;
          logs.push(await assignOne(row));
        }
        setBulkLog(logs);
        load();
      },
    });
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold text-white">Roll Number System</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Manual assign */}
        <div className="glass-card p-6">
          <h2 className="mb-4 font-semibold text-white">Manual Assign</h2>
          {msg && <p className="mb-3 text-sm text-cyan-300">{msg}</p>}
          <div className="space-y-3">
            <input className="input-field" placeholder="Tracking ID (e.g. ITHUB-2026-1001)" value={manual.tracking_id}
              onChange={(e) => setManual({ ...manual, tracking_id: e.target.value })} />
            <input className="input-field" placeholder="Roll No." value={manual.roll_no}
              onChange={(e) => setManual({ ...manual, roll_no: e.target.value })} />
            <div>
              <label className="label">Test Type</label>
              <TestTypeField value={manual.test_type} onChange={(v) => setManual({ ...manual, test_type: v })} />
            </div>
            <input className="input-field" placeholder="Exam/Test Center" value={manual.exam_center}
              onChange={(e) => setManual({ ...manual, exam_center: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field" type="date" value={manual.exam_date}
                onChange={(e) => setManual({ ...manual, exam_date: e.target.value })} />
              <input className="input-field" placeholder="Test Time (e.g. 10:00 AM)" value={manual.exam_time}
                onChange={(e) => setManual({ ...manual, exam_time: e.target.value })} />
            </div>
            <input className="input-field" placeholder="Reporting Time (optional, e.g. 9:30 AM — defaults to test time)" value={manual.reporting_time}
              onChange={(e) => setManual({ ...manual, reporting_time: e.target.value })} />
            <textarea className="input-field h-20" placeholder="Note for student (optional) — e.g. Please come on time / bring your original CNIC"
              value={manual.note} onChange={(e) => setManual({ ...manual, note: e.target.value })} />
            <button onClick={handleManualAssign} className="btn-primary w-full !py-2">Assign Roll Number</button>
          </div>
        </div>

        {/* Bulk CSV */}
        <div className="glass-card p-6">
          <h2 className="mb-4 font-semibold text-white">Bulk Upload (CSV)</h2>
          <p className="mb-3 text-xs text-slate-400">
            Columns: <code className="text-cyan-300">roll_no, tracking_id, test_type, exam_center, exam_date, exam_time, reporting_time, note</code>{" "}
            (<code className="text-cyan-300">test_type, reporting_time, note</code> are optional — test_type defaults to &quot;Entry Test&quot;)
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
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Roll No</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Tracking ID</th>
              <th className="px-4 py-3">Test Type</th>
              <th className="px-4 py-3">Center</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Test Time</th>
              <th className="px-4 py-3">Reporting</th>
              <th className="px-4 py-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const draftType = drafts[r.id]?.test_type ?? r.test_type ?? TEST_TYPE_PRESETS[0];
              const typeIsCustom = !!draftType && !PRESET_SET.includes(draftType);
              return (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="px-4 py-3 font-semibold text-cyan-300">{r.roll_no}</td>
                  <td className="px-4 py-3 text-slate-200">{r.students?.full_name}</td>
                  <td className="px-4 py-3 text-slate-400">{r.students?.tracking_id}</td>
                  <td className="px-4 py-3">
                    <select
                      className="input-field !py-1 text-xs"
                      value={typeIsCustom ? "__custom__" : draftType}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setDrafts((d) => ({ ...d, [r.id]: { ...d[r.id], test_type: "" } }));
                        } else {
                          setDrafts((d) => ({ ...d, [r.id]: { ...d[r.id], test_type: e.target.value } }));
                          updateField(r.id, "test_type", e.target.value);
                        }
                      }}
                    >
                      {TEST_TYPE_PRESETS.map((t) => <option key={t} value={t}>{t}</option>)}
                      <option value="__custom__">Custom...</option>
                    </select>
                    {typeIsCustom && (
                      <input
                        className="input-field mt-1 !py-1 text-xs"
                        placeholder="Custom test type"
                        value={draftType}
                        onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: { ...d[r.id], test_type: e.target.value } }))}
                        onBlur={(e) => { if (e.target.value !== r.test_type) updateField(r.id, "test_type", e.target.value); }}
                        disabled={savingId === r.id}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{r.exam_center}</td>
                  <td className="px-4 py-3 text-slate-400">{r.exam_date}</td>
                  <td className="px-4 py-3 text-slate-400">{r.exam_time}</td>
                  <td className="px-4 py-3">
                    <input
                      className="input-field !py-1 text-xs"
                      placeholder="defaults to test time"
                      value={drafts[r.id]?.reporting_time ?? r.reporting_time ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: { ...d[r.id], reporting_time: e.target.value } }))}
                      onBlur={(e) => { if (e.target.value !== (r.reporting_time ?? "")) updateField(r.id, "reporting_time", e.target.value); }}
                      disabled={savingId === r.id}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="input-field !py-1 text-xs"
                      placeholder="e.g. Please come on time"
                      value={drafts[r.id]?.note ?? r.note ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: { ...d[r.id], note: e.target.value } }))}
                      onBlur={(e) => { if (e.target.value !== (r.note ?? "")) updateField(r.id, "note", e.target.value); }}
                      disabled={savingId === r.id}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
