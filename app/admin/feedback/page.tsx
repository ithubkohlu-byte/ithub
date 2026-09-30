"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Feedback, Student } from "@/types";
import { Star, Trash2 } from "lucide-react";
import clsx from "clsx";

type Row = Feedback & { students: Pick<Student, "full_name" | "tracking_id"> | null };

export default function AdminFeedbackPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("feedback")
      .select("*, students(full_name, tracking_id)")
      .order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(id: string) {
    if (!confirm("Delete this feedback entry?")) return;
    await supabase.from("feedback").delete().eq("id", id);
    load();
  }

  async function toggleApprove(r: Row) {
    await supabase.from("feedback").update({ is_approved: !r.is_approved }).eq("id", r.id);
    load();
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-white">Student Feedback</h1>
      <p className="mb-6 text-sm text-slate-400">
        Review what students submit and approve the ones you want shown as public reviews on the website.
      </p>

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-slate-500">No feedback submitted yet.</p>}

      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.id} className="glass-card p-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 font-semibold text-white">
                  {r.is_guest ? r.guest_name : r.students?.full_name ?? r.student_name ?? "Unknown student"}
                  {r.is_guest && (
                    <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                      Visitor
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">{r.students?.tracking_id}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: r.rating ?? 0 }).map((_, i) => (
                    <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                </span>
                <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
                <button onClick={() => remove(r.id)} className="rounded-lg bg-red-500/10 p-1.5 text-red-300 hover:bg-red-500/20">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="mb-4 text-sm text-slate-300">{r.message}</p>
            <button
              onClick={() => toggleApprove(r)}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition",
                r.is_approved ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-400 hover:bg-white/10"
              )}
            >
              <span className={clsx("h-5 w-9 rounded-full transition relative", r.is_approved ? "bg-neon-line" : "bg-white/15")}>
                <span className={clsx("absolute top-0.5 h-4 w-4 rounded-full bg-white transition", r.is_approved ? "left-4" : "left-0.5")} />
              </span>
              {r.is_approved ? "Shown publicly on website" : "Hidden — approve to show on website"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
