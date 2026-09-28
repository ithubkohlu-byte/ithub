"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Course } from "@/types";
import { COURSE_ICON_KEYS } from "@/types";
import { Plus, Trash2, Save, GripVertical } from "lucide-react";
import clsx from "clsx";

const EMPTY_FORM = { name: "", description: "", duration: "", icon_key: "code" as string, full_info: "" };

export default function AdminCoursesPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [msg, setMsg] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("courses").select("*").order("display_order", { ascending: true });
    setCourses((data as Course[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addCourse() {
    if (!form.name.trim()) return;
    setMsg(null);
    const nextOrder = courses.length > 0 ? Math.max(...courses.map((c) => c.display_order)) + 1 : 1;
    const { error } = await supabase.from("courses").insert({ ...form, display_order: nextOrder, is_open: true });
    if (error) return setMsg(error.message);
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  }

  // Local edits are kept in state and saved explicitly, so admin can fix a
  // typo in a course name without triggering a save on every keystroke.
  function patchLocal(id: string, patch: Partial<Course>) {
    setCourses((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function saveCourse(c: Course) {
    setSavingId(c.id);
    setMsg(null);
    const { error } = await supabase
      .from("courses")
      .update({
        name: c.name,
        description: c.description,
        duration: c.duration,
        icon_key: c.icon_key,
        display_order: c.display_order,
        full_info: c.full_info,
      })
      .eq("id", c.id);
    setSavingId(null);
    if (error) setMsg(`Could not save "${c.name}": ${error.message}`);
    else load();
  }

  async function toggleOpen(c: Course) {
    await supabase.from("courses").update({ is_open: !c.is_open }).eq("id", c.id);
    load();
  }

  async function deleteCourse(c: Course) {
    if (!confirm(`Delete "${c.name}"? This only works if no batches use this course.`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", c.id);
    if (error) {
      setMsg(`Could not delete "${c.name}" — remove or reassign its batches first.`);
      return;
    }
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Courses</h1>
          <p className="mt-1 text-sm text-slate-400">
            Rename, describe, or open/close any course. Batches update automatically when you rename a course.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary !py-2">
          <Plus size={16} /> New Course
        </button>
      </div>

      {msg && <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">{msg}</p>}

      {showForm && (
        <div className="glass-card mb-6 p-6">
          <h2 className="mb-4 font-semibold text-white">Add Course</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input-field" placeholder="Course Name (e.g. AI & Machine Learning)" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input-field" placeholder="Duration (e.g. 4 Months)" value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            <select className="input-field" value={form.icon_key} onChange={(e) => setForm({ ...form, icon_key: e.target.value })}>
              {COURSE_ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <input className="input-field sm:col-span-2" placeholder="Short description shown on the homepage" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <textarea className="input-field h-24 sm:col-span-2"
              placeholder="Full details shown to a student once they select this course (eligibility, syllabus, fee, etc.)"
              value={form.full_info} onChange={(e) => setForm({ ...form, full_info: e.target.value })} />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={addCourse} className="btn-primary !py-2">Save Course</button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="btn-outline !py-2">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading && <p className="text-slate-500">Loading...</p>}
        {!loading && courses.length === 0 && <p className="text-slate-500">No courses yet.</p>}
        {courses.map((c) => (
          <div key={c.id} className="glass-card p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <GripVertical size={16} className="hidden shrink-0 text-slate-600 sm:block" />
              <input
                className="input-field flex-1 font-semibold"
                value={c.name}
                onChange={(e) => patchLocal(c.id, { name: e.target.value })}
              />
              <button
                onClick={() => toggleOpen(c)}
                className={clsx(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  c.is_open ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                )}
              >
                {c.is_open ? "Open for Applications" : "Closed"}
              </button>
              <button onClick={() => deleteCourse(c)} className="shrink-0 text-slate-500 hover:text-red-400">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px]">
              <input
                className="input-field"
                placeholder="Description shown on the homepage"
                value={c.description}
                onChange={(e) => patchLocal(c.id, { description: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Duration"
                value={c.duration}
                onChange={(e) => patchLocal(c.id, { duration: e.target.value })}
              />
              <select
                className="input-field"
                value={c.icon_key}
                onChange={(e) => patchLocal(c.id, { icon_key: e.target.value })}
              >
                {COURSE_ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <textarea
              className="input-field mt-3 h-24 w-full"
              placeholder="Full details shown to a student once they select this course (eligibility, syllabus, fee, etc.)"
              value={c.full_info}
              onChange={(e) => patchLocal(c.id, { full_info: e.target.value })}
            />
            <button onClick={() => saveCourse(c)} disabled={savingId === c.id} className="btn-outline mt-3 !py-1.5 !px-4 text-xs">
              <Save size={13} /> {savingId === c.id ? "Saving..." : "Save"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
