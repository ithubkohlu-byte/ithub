"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { UserPlus, Upload, Loader2 } from "lucide-react";

export default function AdminRollNumbersPage() {
  const supabase = createClient();
  const [rolls, setRolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ tracking_id: "", roll_no: "", exam_center: "", exam_date: "", exam_time: "" });
  const [csvSummary, setCsvSummary] = useState<{ ok: number; failed: string[] } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("roll_numbers").select("*, students(full_name, tracking_id)").order("created_at", { ascending: false });
    setRolls(data || []);
  }

  async function handleAssign() {
    if (!form.tracking_id || !form.roll_no) return toast.error("Tracking ID and Roll No are required");
    setLoading(true);
    const { data: student, error: findErr } = await supabase.from("students").select("id").eq("tracking_id", form.tracking_id).maybeSingle();
    if (findErr || !student) { setLoading(false); return toast.error("Student not found for this tracking ID"); }

    const { data: enroll } = await supabase.from("enrollments").select("id").eq("student_id", student.id).maybeSingle();

    const { error } = await supabase.from("roll_numbers").insert({
      student_id: student.id,
      enrollment_id: enroll?.id || null,
      roll_no: form.roll_no,
      exam_center: form.exam_center,
      exam_date: form.exam_date || null,
      exam_time: form.exam_time || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Roll number assigned");
    setForm({ tracking_id: "", roll_no: "", exam_center: "", exam_date: "", exam_time: "" });
    load();
  }

  async function handleCsvUpload(file: File) {
    const text = await file.text();
    const lines = text.trim().split("\n");
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1);

    let ok = 0;
    const failed: string[] = [];

    for (const row of rows) {
      const cols = row.split(",").map((c) => c.trim());
      const rec: Record<string, string> = {};
      header.forEach((h, i) => (rec[h] = cols[i]));

      if (!rec.tracking_id || !rec.roll_no) { failed.push(row); continue; }

      const { data: student } = await supabase.from("students").select("id").eq("tracking_id", rec.tracking_id).maybeSingle();
      if (!student) { failed.push(`${rec.tracking_id} (not found)`); continue; }

      const { data: enroll } = await supabase.from("enrollments").select("id").eq("student_id", student.id).maybeSingle();

      const { error } = await supabase.from("roll_numbers").insert({
        student_id: student.id,
        enrollment_id: enroll?.id || null,
        roll_no: rec.roll_no,
        exam_center: rec.exam_center || null,
        exam_date: rec.exam_date || null,
        exam_time: rec.exam_time || null,
      });
      if (error) failed.push(`${rec.tracking_id} (${error.message})`);
      else ok++;
    }
    setCsvSummary({ ok, failed });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Roll Numbers</h1>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="glass rounded-2xl p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2"><UserPlus size={18} /> Manual Assign</h2>
          <div className="space-y-3">
            <Input placeholder="Tracking ID" value={form.tracking_id} onChange={(v: string) => setForm({ ...form, tracking_id: v })} />
            <Input placeholder="Roll No" value={form.roll_no} onChange={(v: string) => setForm({ ...form, roll_no: v })} />
            <Input placeholder="Exam Center" value={form.exam_center} onChange={(v: string) => setForm({ ...form, exam_center: v })} />
            <Input type="date" value={form.exam_date} onChange={(v: string) => setForm({ ...form, exam_date: v })} />
            <Input type="time" value={form.exam_time} onChange={(v: string) => setForm({ ...form, exam_time: v })} />
            <button onClick={handleAssign} disabled={loading} className="btn-neon text-white w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2">
              {loading && <Loader2 className="animate-spin" size={16} />} Assign Roll Number
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2"><Upload size={18} /> Bulk Upload (CSV)</h2>
          <p className="text-white/50 text-xs mb-4">Columns: roll_no, tracking_id, exam_center, exam_date, exam_time</p>
          <label className="glass px-4 py-3 rounded-lg text-sm cursor-pointer block text-center">
            Choose CSV File
            <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleCsvUpload(e.target.files[0])} />
          </label>
          {csvSummary && (
            <div className="mt-4 text-sm">
              <p className="text-accent">{csvSummary.ok} assigned successfully</p>
              {csvSummary.failed.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-300">{csvSummary.failed.length} failed:</p>
                  <ul className="text-xs text-white/50 list-disc pl-4">
                    {csvSummary.failed.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 border-b border-white/10">
              <th className="py-2 pr-4">Roll No</th>
              <th className="py-2 pr-4">Student</th>
              <th className="py-2 pr-4">Center</th>
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Time</th>
            </tr>
          </thead>
          <tbody>
            {rolls.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="py-3 pr-4 font-medium">{r.roll_no}</td>
                <td className="py-3 pr-4">{r.students?.full_name} ({r.students?.tracking_id})</td>
                <td className="py-3 pr-4">{r.exam_center}</td>
                <td className="py-3 pr-4">{r.exam_date}</td>
                <td className="py-3 pr-4">{r.exam_time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Input({ onChange, ...props }: any) {
  return (
    <input {...props} onChange={(e: any) => onChange(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white" />
  );
}
