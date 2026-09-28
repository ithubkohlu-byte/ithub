"use client";

import { useEffect, useState, Fragment } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Batch, Course } from "@/types";
import { Plus, Trash2, X, Settings2 } from "lucide-react";
import clsx from "clsx";

type BatchRow = Batch & { course_names: string[] };

function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

export default function AdminBatchesPage() {
  const supabase = createClient();
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ batch_name: "", start_date: "" });
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [managingId, setManagingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data }, { data: courseData }] = await Promise.all([
      supabase.from("batches").select("*, batch_courses(course_name)").order("created_at", { ascending: false }),
      supabase.from("courses").select("*").order("display_order", { ascending: true }),
    ]);
    const rows = ((data as any[]) ?? []).map((b) => ({
      ...b,
      course_names: Array.from(new Set([b.course_name, ...(b.batch_courses ?? []).map((c: any) => c.course_name)])),
    })) as BatchRow[];
    setBatches(rows);
    const openCourses = ((courseData as Course[]) ?? []).filter((c) => c.is_open);
    setCourses(openCourses);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSelected(name: string) {
    setSelectedCourses((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  }

  async function createBatch() {
    if (!form.batch_name || !form.start_date || selectedCourses.length === 0) return;
    const { data, error } = await supabase
      .from("batches")
      .insert({
        batch_name: form.batch_name,
        course_name: selectedCourses[0], // primary course; trigger also adds it to batch_courses
        start_date: form.start_date,
        end_date: addMonths(form.start_date, 3),
        seats_total: 50,
        seats_filled: 0,
        status: "draft",
        is_announced: false,
      })
      .select()
      .single();
    if (error || !data) return;

    // Any remaining selected courses beyond the primary one.
    const extra = selectedCourses.slice(1);
    if (extra.length > 0) {
      await supabase.from("batch_courses").insert(extra.map((course_name) => ({ batch_id: data.id, course_name })));
    }

    setForm({ batch_name: "", start_date: "" });
    setSelectedCourses([]);
    setShowForm(false);
    load();
  }

  async function toggleAnnounce(b: Batch) {
    await supabase.from("batches").update({ is_announced: !b.is_announced }).eq("id", b.id);
    load();
  }

  async function updateStatus(b: Batch, status: Batch["status"]) {
    await supabase.from("batches").update({ status }).eq("id", b.id);
    load();
  }

  async function deleteBatch(id: string) {
    if (!confirm("Delete this batch? This cannot be undone.")) return;
    await supabase.from("batches").delete().eq("id", id);
    load();
  }

  // Add/assign a course to an existing batch (satisfies "admin can assign a new course to a batch").
  async function assignCourse(batch: BatchRow, courseName: string) {
    await supabase.from("batch_courses").insert({ batch_id: batch.id, course_name: courseName });
    load();
  }

  // Remove a course from a batch. The primary course_name can't be removed this way —
  // change it by editing the batch's primary course instead (rare; delete/recreate is simplest).
  async function removeCourse(batch: BatchRow, courseName: string) {
    if (courseName === batch.course_name) return;
    await supabase.from("batch_courses").delete().eq("batch_id", batch.id).eq("course_name", courseName);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-white">Batch Management</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary !py-2">
          <Plus size={16} /> New Batch
        </button>
      </div>

      {showForm && (
        <div className="glass-card mb-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Create Batch</h2>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input-field" placeholder="Batch Name (e.g. Batch 4)" value={form.batch_name}
              onChange={(e) => setForm({ ...form, batch_name: e.target.value })} />
            <input className="input-field" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>

          <div className="mt-4">
            <p className="label mb-2">Courses available in this batch</p>
            {courses.length === 0 && <p className="text-xs text-amber-400">No open courses — add one first from Courses.</p>}
            <div className="flex flex-wrap gap-2">
              {courses.map((c) => {
                const checked = selectedCourses.includes(c.name);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleSelected(c.name)}
                    className={clsx(
                      "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                      checked ? "border-neon-cyan/60 bg-neon-cyan/10 text-cyan-200" : "border-white/10 text-slate-400 hover:border-white/25"
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500">Select every course this batch should be enrolled for. The first one picked becomes the primary course.</p>
          </div>

          <button onClick={createBatch} className="btn-primary mt-4 !py-2">Save Batch</button>
        </div>
      )}

      <div className="glass-card overflow-x-auto scroll-thin p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Batch</th>
              <th className="px-5 py-3">Courses</th>
              <th className="px-5 py-3">Dates</th>
              <th className="px-5 py-3">Seats</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Announced</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="px-5 py-6 text-slate-500" colSpan={7}>Loading...</td></tr>}
            {!loading && batches.length === 0 && <tr><td className="px-5 py-6 text-slate-500" colSpan={7}>No batches yet.</td></tr>}
            {batches.map((b) => (
              <Fragment key={b.id}>
                <tr className="border-b border-white/5">
                  <td className="px-5 py-3 font-medium text-white">{b.batch_name}</td>
                  <td className="px-5 py-3 text-slate-300">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {b.course_names.map((c) => (
                        <span key={c} className="rounded-full bg-white/5 px-2 py-0.5 text-xs">{c}</span>
                      ))}
                      <button
                        onClick={() => setManagingId(managingId === b.id ? null : b.id)}
                        className="ml-1 flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-xs text-cyan-300 hover:border-white/25"
                      >
                        <Settings2 size={12} /> Manage
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">{b.start_date} → {b.end_date}</td>
                  <td className="px-5 py-3 text-slate-300">{b.seats_filled}/{b.seats_total}</td>
                  <td className="px-5 py-3">
                    <select
                      value={b.status}
                      onChange={(e) => updateStatus(b, e.target.value as Batch["status"])}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="draft">Draft</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleAnnounce(b)}
                      className={clsx("h-6 w-11 rounded-full transition relative", b.is_announced ? "bg-neon-line" : "bg-white/10")}
                    >
                      <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition", b.is_announced ? "left-5" : "left-0.5")} />
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => deleteBatch(b.id)} className="text-slate-500 hover:text-red-400">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
                {managingId === b.id && (
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <td colSpan={7} className="px-5 py-4">
                      <p className="mb-2 text-xs uppercase text-slate-500">Assign / remove courses for {b.batch_name}</p>
                      <div className="flex flex-wrap gap-2">
                        {courses.map((c) => {
                          const active = b.course_names.includes(c.name);
                          const isPrimary = c.name === b.course_name;
                          return (
                            <button
                              key={c.id}
                              onClick={() => (active ? removeCourse(b, c.name) : assignCourse(b, c.name))}
                              disabled={isPrimary}
                              title={isPrimary ? "Primary course — cannot be removed here" : undefined}
                              className={clsx(
                                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                                active
                                  ? "border-neon-cyan/60 bg-neon-cyan/10 text-cyan-200"
                                  : "border-white/10 text-slate-400 hover:border-white/25",
                                isPrimary && "cursor-not-allowed opacity-70"
                              )}
                            >
                              {c.name}{isPrimary ? " (primary)" : ""}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
