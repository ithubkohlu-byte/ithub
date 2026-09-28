"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HomeContent } from "@/types";
import { Save, UploadCloud, Trash2 } from "lucide-react";

export default function AdminContentPage() {
  const supabase = createClient();
  const [content, setContent] = useState<HomeContent | null>(null);
  const [whyPointsText, setWhyPointsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("home_content").select("*").eq("id", 1).single();
      setContent(data as HomeContent);
      setWhyPointsText((data?.why_choose_us_points ?? []).join("\n"));
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!content) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("home_content")
      .update({
        institute_name: content.institute_name,
        developer_name: content.developer_name,
        hero_title: content.hero_title,
        hero_subtitle: content.hero_subtitle,
        about_text: content.about_text,
        why_choose_us_points: whyPointsText.split("\n").filter(Boolean),
        contact_phone: content.contact_phone,
        contact_email: content.contact_email,
        contact_address: content.contact_address,
        help_content: content.help_content,
        admission_note: content.admission_note,
        id_card_terms: content.id_card_terms,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    setMsg(error ? error.message : "Saved — changes are live on the homepage.");
  }

  async function uploadLogo() {
    if (!logoFile || !content) return;
    setUploadingLogo(true);
    setMsg(null);
    const path = `logo/${Date.now()}-${logoFile.name}`;
    const { error: upErr } = await supabase.storage.from("site_assets").upload(path, logoFile, { upsert: true });
    if (upErr) {
      setMsg(upErr.message);
      setUploadingLogo(false);
      return;
    }
    const { data: pub } = supabase.storage.from("site_assets").getPublicUrl(path);
    const { error } = await supabase.from("home_content").update({ logo_url: pub.publicUrl }).eq("id", 1);
    setUploadingLogo(false);
    if (error) return setMsg(error.message);
    setContent({ ...content, logo_url: pub.publicUrl });
    setLogoFile(null);
    setMsg("Logo updated — it now shows in the navbar, footer and browser tab.");
  }

  async function removeLogo() {
    if (!content) return;
    const { error } = await supabase.from("home_content").update({ logo_url: null }).eq("id", 1);
    if (error) return setMsg(error.message);
    setContent({ ...content, logo_url: null });
    setMsg("Logo removed — the default IT HUB KOHLU mark is shown again.");
  }

  if (!content) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 font-display text-2xl font-semibold text-white">Home Content</h1>
      {msg && <p className="mb-4 text-sm text-cyan-300">{msg}</p>}

      <div className="glass-card mb-6 space-y-4 p-6">
        <h2 className="mb-1 font-semibold text-white">Branding</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <F
            label="Institute Name"
            value={content.institute_name}
            onChange={(v) => setContent({ ...content, institute_name: v })}
          />
          <F
            label="Developer Name (shown in footer credit)"
            value={content.developer_name}
            onChange={(v) => setContent({ ...content, developer_name: v })}
          />
        </div>
        <p className="text-xs text-slate-500">
          The institute name appears in the navbar, footer, admin sidebar and on the printed admission letter / roll
          no. slip.
        </p>
      </div>

      <div className="glass-card mb-6 p-6">
        <h2 className="mb-1 font-semibold text-white">Site Logo</h2>
        <p className="mb-4 text-sm text-slate-400">
          Shown in the navbar, footer, admin sidebar and browser tab. Leave empty to use the default IT HUB KOHLU mark.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
            {content.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={content.logo_url} alt="Current logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-slate-500">None</span>
            )}
          </div>
          <label className="btn-outline flex cursor-pointer justify-center !py-2 text-sm">
            <UploadCloud size={16} /> {logoFile ? logoFile.name : "Choose Image"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
          </label>
          <button onClick={uploadLogo} disabled={!logoFile || uploadingLogo} className="btn-primary !py-2">
            {uploadingLogo ? "Uploading..." : "Upload"}
          </button>
          {content.logo_url && (
            <button onClick={removeLogo} className="flex items-center gap-1 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20">
              <Trash2 size={13} /> Remove
            </button>
          )}
        </div>
      </div>

      <div className="glass-card space-y-4 p-6">
        <F label="Hero Title" value={content.hero_title} onChange={(v) => setContent({ ...content, hero_title: v })} />
        <F label="Hero Subtitle" textarea value={content.hero_subtitle} onChange={(v) => setContent({ ...content, hero_subtitle: v })} />
        <F label="About Text" textarea value={content.about_text} onChange={(v) => setContent({ ...content, about_text: v })} />
        <div>
          <label className="label">Why Choose Us (one point per line)</label>
          <textarea className="input-field h-28" value={whyPointsText} onChange={(e) => setWhyPointsText(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <F label="Phone" value={content.contact_phone} onChange={(v) => setContent({ ...content, contact_phone: v })} />
          <F label="Email" value={content.contact_email} onChange={(v) => setContent({ ...content, contact_email: v })} />
          <F label="Address" value={content.contact_address} onChange={(v) => setContent({ ...content, contact_address: v })} />
        </div>
        <F
          label="Help Tab Content (shown to students on the dashboard's Help tab)"
          textarea
          value={content.help_content}
          onChange={(v) => setContent({ ...content, help_content: v })}
        />
        <F
          label="Admission Letter Note (optional — printed on every generated admission letter)"
          textarea
          value={content.admission_note}
          onChange={(v) => setContent({ ...content, admission_note: v })}
        />
        <F
          label="Student ID Card — Terms & Conditions (printed on the back of every card)"
          textarea
          value={content.id_card_terms}
          onChange={(v) => setContent({ ...content, id_card_terms: v })}
        />
        <button onClick={save} disabled={saving} className="btn-primary !py-2">
          <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Manage course names, descriptions and which courses are open for applications on the{" "}
        <a href="/admin/courses" className="text-cyan-300 hover:underline">Courses</a> page.
      </p>
    </div>
  );
}

function F({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      {textarea ? (
        <textarea className="input-field h-24" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input-field" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
