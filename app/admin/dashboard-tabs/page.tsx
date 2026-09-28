"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DashboardTab } from "@/types";
import { Plus, Save, Trash2, Eye, EyeOff } from "lucide-react";

export default function AdminDashboardTabsPage() {
  const supabase = createClient();
  const [tabs, setTabs] = useState<DashboardTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("dashboard_tabs").select("*").order("display_order", { ascending: true });
    setTabs((data as DashboardTab[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addTab() {
    if (!title.trim() || !content.trim()) return;
    setCreating(true);
    setMsg(null);
    const nextOrder = tabs.length ? Math.max(...tabs.map((t) => t.display_order)) + 1 : 0;
    const { error } = await supabase.from("dashboard_tabs").insert({
      title: title.trim(),
      content: content.trim(),
      display_order: nextOrder,
      is_active: true,
    });
    setCreating(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setTitle("");
    setContent("");
    setMsg("Tab added — it now shows on every student's dashboard.");
    load();
  }

  async function toggleActive(t: DashboardTab) {
    await supabase.from("dashboard_tabs").update({ is_active: !t.is_active }).eq("id", t.id);
    load();
  }

  async function updateTab(t: DashboardTab, title: string, content: string) {
    await supabase.from("dashboard_tabs").update({ title, content }).eq("id", t.id);
    load();
  }

  async function removeTab(id: string) {
    if (!confirm("Delete this tab? It will disappear from every student's dashboard.")) return;
    await supabase.from("dashboard_tabs").delete().eq("id", id);
    load();
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 font-display text-2xl font-semibold text-white">Student Dashboard Tabs</h1>
      <p className="mb-6 text-sm text-slate-400">
        "My Application", "Roll Number", "Help" and "Feedback" always show on the student dashboard. Add extra tabs
        here (e.g. announcements, rules, scholarship info) — they'll appear alongside them for every student.
      </p>
      {msg && <p className="mb-4 text-sm text-cyan-300">{msg}</p>}

      <div className="glass-card mb-6 space-y-3 p-6">
        <h2 className="font-semibold text-white">Add a New Tab</h2>
        <div>
          <label className="label">Tab Title</label>
          <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Scholarships" />
        </div>
        <div>
          <label className="label">Tab Content</label>
          <textarea className="input-field h-28" value={content} onChange={(e) => setContent(e.target.value)} placeholder="What students will read on this tab..." />
        </div>
        <button onClick={addTab} disabled={creating} className="btn-primary !py-2">
          <Plus size={16} /> {creating ? "Adding..." : "Add Tab"}
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading...</p>}

      <div className="space-y-4">
        {tabs.map((t) => (
          <TabEditor key={t.id} tab={t} onSave={updateTab} onToggle={toggleActive} onDelete={removeTab} />
        ))}
        {!loading && tabs.length === 0 && <p className="text-sm text-slate-500">No custom tabs added yet.</p>}
      </div>
    </div>
  );
}

function TabEditor({
  tab,
  onSave,
  onToggle,
  onDelete,
}: {
  tab: DashboardTab;
  onSave: (t: DashboardTab, title: string, content: string) => void;
  onToggle: (t: DashboardTab) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(tab.title);
  const [content, setContent] = useState(tab.content);
  const dirty = title !== tab.title || content !== tab.content;

  return (
    <div className="glass-card space-y-3 p-6">
      <div className="flex items-center justify-between gap-3">
        <input className="input-field flex-1" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button
          onClick={() => onToggle(tab)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
            tab.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-400"
          }`}
        >
          {tab.is_active ? <Eye size={13} /> : <EyeOff size={13} />} {tab.is_active ? "Visible" : "Hidden"}
        </button>
        <button onClick={() => onDelete(tab.id)} className="rounded-lg bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20">
          <Trash2 size={15} />
        </button>
      </div>
      <textarea className="input-field h-24" value={content} onChange={(e) => setContent(e.target.value)} />
      {dirty && (
        <button onClick={() => onSave(tab, title, content)} className="btn-outline !py-1.5 text-sm">
          <Save size={14} /> Save Changes
        </button>
      )}
    </div>
  );
}
