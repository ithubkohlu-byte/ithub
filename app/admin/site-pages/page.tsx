"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SitePage } from "@/types";
import { Plus, Trash2, Save } from "lucide-react";
import clsx from "clsx";

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const EMPTY = { title: "", slug: "", content: "" };

export default function AdminSitePagesPage() {
  const supabase = createClient();
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("site_pages").select("*").order("display_order", { ascending: true });
    setPages((data as SitePage[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addPage() {
    if (!form.title.trim()) return;
    setMsg(null);
    const nextOrder = pages.length > 0 ? Math.max(...pages.map((p) => p.display_order)) + 1 : 1;
    const { error } = await supabase.from("site_pages").insert({
      title: form.title,
      slug: form.slug.trim() || slugify(form.title),
      content: form.content,
      display_order: nextOrder,
      show_in_nav: true,
      is_active: true,
    });
    if (error) return setMsg(error.message);
    setForm(EMPTY);
    setShowForm(false);
    load();
  }

  function patchLocal(id: string, patch: Partial<SitePage>) {
    setPages((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function savePage(p: SitePage) {
    setSavingId(p.id);
    setMsg(null);
    const { error } = await supabase
      .from("site_pages")
      .update({
        title: p.title,
        slug: p.slug,
        content: p.content,
        display_order: p.display_order,
        show_in_nav: p.show_in_nav,
        is_active: p.is_active,
      })
      .eq("id", p.id);
    setSavingId(null);
    if (error) setMsg(`Could not save "${p.title}": ${error.message}`);
    else load();
  }

  async function deletePage(p: SitePage) {
    if (!confirm(`Delete the "${p.title}" tab/page?`)) return;
    await supabase.from("site_pages").delete().eq("id", p.id);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Site Pages / Tabs</h1>
          <p className="mt-1 text-sm text-slate-400">
            Add a new page — it shows up as a link in the site navbar and lives at{" "}
            <code className="text-cyan-300">/page/&lt;slug&gt;</code>. Turn off &quot;In Nav&quot; to keep a page live without
            listing it, or deactivate it to hide it entirely. No code needed.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary !py-2">
          <Plus size={16} /> New Page
        </button>
      </div>

      {msg && <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">{msg}</p>}

      {showForm && (
        <div className="glass-card mb-6 p-6">
          <h2 className="mb-4 font-semibold text-white">Add Page</h2>
          <div className="space-y-3">
            <input className="input-field" placeholder="Title (e.g. Scholarships)" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="input-field" placeholder={`Slug (optional — auto: ${slugify(form.title) || "your-title"})`}
              value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <textarea className="input-field h-32" placeholder="Page content" value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={addPage} className="btn-primary !py-2">Save Page</button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY); }} className="btn-outline !py-2">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading && <p className="text-slate-500">Loading...</p>}
        {!loading && pages.length === 0 && <p className="text-slate-500">No pages yet.</p>}
        {pages.map((p) => (
          <div key={p.id} className="glass-card p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <input className="input-field flex-1 font-semibold" value={p.title}
                onChange={(e) => patchLocal(p.id, { title: e.target.value })} />
              <input className="input-field w-48" value={p.slug} onChange={(e) => patchLocal(p.id, { slug: e.target.value })} />
              <button
                onClick={() => patchLocal(p.id, { show_in_nav: !p.show_in_nav })}
                className={clsx(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  p.show_in_nav ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 text-slate-400"
                )}
              >
                {p.show_in_nav ? "In Nav" : "Hidden from Nav"}
              </button>
              <button
                onClick={() => patchLocal(p.id, { is_active: !p.is_active })}
                className={clsx(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  p.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                )}
              >
                {p.is_active ? "Active" : "Inactive"}
              </button>
              <button onClick={() => deletePage(p)} className="shrink-0 text-slate-500 hover:text-red-400">
                <Trash2 size={16} />
              </button>
            </div>
            <textarea className="input-field h-28 w-full" value={p.content}
              onChange={(e) => patchLocal(p.id, { content: e.target.value })} />
            <button onClick={() => savePage(p)} disabled={savingId === p.id} className="btn-outline mt-3 !py-1.5 !px-4 text-xs">
              <Save size={13} /> {savingId === p.id ? "Saving..." : "Save"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
