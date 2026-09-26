"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { COURSES } from "@/lib/utils";

const emptyForm = {
  id: "", batch_name: "", course_name: COURSES[0], start_date: "", end_date: "",
  status: "Draft", is_announced: false,
};

export default function AdminBatchesPage() {
  const supabase = createClient();
  const [batches, setBatches] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("batches").select("*").order("created_at", { ascending: false });
    setBatches(data || []);
  }

  function openNew() {
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(b: any) {
    setForm({ ...b });
    setShowForm(true);
  }

  function autoEndDate(start: string) {
    if (!start) return "";
    const d = new Date(start);
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split("T")[0];
  }

  async function handleSave() {
    if (!form.batch_name || !form.start_date) return toast.error("Fill batch name and start date");
    const payload = {
      batch_name: form.batch_name,
      course_name: form.course_name,
      start_date: form.start_date,
      end_date: form.end_date || autoEndDate(form.start_date),
      status: form.status,
      is_announced: form.is_announced,
      seats_total: 50,
    };
    if (form.id) {
      const { error } = await supabase.from("batches").update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
      toast.success("Batch updated");
    } else {
      const { error } = await supabase.from("batches").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Batch created");
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this batch?")) return;
    const { error } = await supabase.from("batches").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Batches</h1>
        <button onClick={openNew} className="btn-neon text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <Plus size={16} /> New Batch
        </button>
      </div>

      <div className="glass rounded-2xl p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 border-b border-white/10">
              <th className="py-2 pr-4">Batch</th>
              <th className="py-2 pr-4">Course</th>
              <th className="py-2 pr-4">Dates</th>
              <th className="py-2 pr-4">Seats</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Announced</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} className="border-b border-white/5">
                <td className="py-3 pr-4 font-medium">{b.batch_name}</td>
                <td className="py-3 pr-4">{b.course_name}</td>
                <td className="py-3 pr-4 text-white/50 text-xs">{b.start_date} → {b.end_date}</td>
                <td className="py-3 pr-4">{b.seats_filled}/{b.seats_total}</td>
                <td className="py-3 pr-4">{b.seats_filled >= b.seats_total ? "Closed" : b.status}</td>
                <td className="py-3 pr-4">{b.is_announced ? "Yes" : "No"}</td>
                <td className="py-3 pr-4 flex gap-2">
                  <button onClick={() => openEdit(b)} className="p-2 glass rounded-lg"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(b.id)} className="p-2 glass rounded-lg text-red-400"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="glass rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-lg">{form.id ? "Edit Batch" : "New Batch"}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <Field label="Batch Name" value={form.batch_name} onChange={(v: string) => setForm({ ...form, batch_name: v })} />
              <label className="block">
                <span className="text-sm text-white/70 mb-1.5 block">Course</span>
                <select value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5">
                  {COURSES.map((c) => <option key={c} value={c} className="bg-base">{c}</option>)}
                </select>
              </label>
              <Field label="Start Date" type="date" value={form.start_date}
                onChange={(v: string) => setForm({ ...form, start_date: v, end_date: form.end_date || autoEndDate(v) })} />
              <Field label="End Date" type="date" value={form.end_date} onChange={(v: string) => setForm({ ...form, end_date: v })} />
              <label className="block">
                <span className="text-sm text-white/70 mb-1.5 block">Seats Total</span>
                <input disabled value={50} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white/40" />
              </label>
              <label className="block">
                <span className="text-sm text-white/70 mb-1.5 block">Status</span>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5">
                  {["Draft", "Open", "Closed"].map((s) => <option key={s} value={s} className="bg-base">{s}</option>)}
                </select>
              </label>
              <label className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                <div>
                  <p className="text-sm font-medium">Announce Publicly</p>
                  <p className="text-xs text-white/40">If ON, batch will be visible to public</p>
                </div>
                <input type="checkbox" checked={form.is_announced} onChange={(e) => setForm({ ...form, is_announced: e.target.checked })} className="h-5 w-5 accent-accent" />
              </label>
            </div>
            <button onClick={handleSave} className="btn-neon text-white w-full py-2.5 rounded-lg font-medium mt-6">Save Batch</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, ...props }: any) {
  return (
    <label className="block">
      <span className="text-sm text-white/70 mb-1.5 block">{label}</span>
      <input {...props} onChange={(e: any) => props.onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white" />
    </label>
  );
}
