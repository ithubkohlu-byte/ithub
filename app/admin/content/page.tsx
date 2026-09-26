"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function AdminContentPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<any>(null);
  const [points, setPoints] = useState<string[]>([]);
  const [courses, setCourses] = useState<Record<string, { title: string; desc: string }>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("home_content").select("*").limit(1).maybeSingle();
      if (data) {
        setRow(data);
        setPoints(data.why_choose_us_points || []);
        setCourses(data.course_descriptions || {});
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    const payload = { ...row, why_choose_us_points: points, course_descriptions: courses };
    const { error } = row.id
      ? await supabase.from("home_content").update(payload).eq("id", row.id)
      : await supabase.from("home_content").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Content saved");
  }

  if (loading || !row) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent" size={28} /></div>;

  const set = (k: string) => (e: any) => setRow({ ...row, [k]: e.target.value });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Home Content</h1>

      <div className="glass rounded-2xl p-6 mb-6 space-y-4">
        <h2 className="font-bold">Hero Section</h2>
        <Field label="Hero Title" value={row.hero_title} onChange={set("hero_title")} />
        <Textarea label="Hero Subtitle" value={row.hero_subtitle} onChange={set("hero_subtitle")} />
      </div>

      <div className="glass rounded-2xl p-6 mb-6 space-y-4">
        <h2 className="font-bold">About</h2>
        <Textarea label="About Text" value={row.about_text} onChange={set("about_text")} rows={5} />
      </div>

      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold">Why Choose Us</h2>
          <button onClick={() => setPoints([...points, ""])} className="glass px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
            <Plus size={14} /> Add Point
          </button>
        </div>
        <div className="space-y-3">
          {points.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={p}
                onChange={(e) => setPoints(points.map((x, idx) => (idx === i ? e.target.value : x)))}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm"
              />
              <button onClick={() => setPoints(points.filter((_, idx) => idx !== i))} className="glass px-3 rounded-lg text-red-300">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 mb-6 space-y-6">
        <h2 className="font-bold">Course Descriptions</h2>
        {Object.entries(courses).map(([key, c]) => (
          <div key={key} className="bg-white/5 rounded-lg p-4 space-y-3">
            <Field label={`${key} — Title`} value={c.title} onChange={(e: any) => setCourses({ ...courses, [key]: { ...c, title: e.target.value } })} />
            <Textarea label={`${key} — Description`} value={c.desc} onChange={(e: any) => setCourses({ ...courses, [key]: { ...c, desc: e.target.value } })} />
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6 mb-6 space-y-4">
        <h2 className="font-bold">Contact Info</h2>
        <Field label="Phone" value={row.contact_phone} onChange={set("contact_phone")} />
        <Field label="Email" value={row.contact_email} onChange={set("contact_email")} />
        <Field label="Address" value={row.contact_address} onChange={set("contact_address")} />
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-neon text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2">
        {saving && <Loader2 className="animate-spin" size={16} />} Save Changes
      </button>
    </div>
  );
}

function Field({ label, ...props }: any) {
  return (
    <label className="block">
      <span className="text-sm text-white/70 mb-1.5 block">{label}</span>
      <input {...props} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white" />
    </label>
  );
}

function Textarea({ label, ...props }: any) {
  return (
    <label className="block">
      <span className="text-sm text-white/70 mb-1.5 block">{label}</span>
      <textarea {...props} rows={props.rows || 3} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white" />
    </label>
  );
}
