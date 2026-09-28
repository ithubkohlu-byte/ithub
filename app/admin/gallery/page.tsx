"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GalleryItem } from "@/types";
import { EyeOff, Trash2, UploadCloud } from "lucide-react";

export default function AdminGalleryPage() {
  const supabase = createClient();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [batchName, setBatchName] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const { data } = await supabase.from("gallery").select("*").order("created_at", { ascending: false });
    setItems((data as GalleryItem[]) ?? []);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function upload() {
    if (!file) return;
    setUploading(true);
    const path = `${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("gallery_images").upload(path, file);
    if (!upErr) {
      const { data: pub } = supabase.storage.from("gallery_images").getPublicUrl(path);
      await supabase.from("gallery").insert({ image_url: pub.publicUrl, batch_name: batchName || null, caption: caption || null });
      setBatchName(""); setCaption(""); setFile(null);
      load();
    }
    setUploading(false);
  }

  async function toggleHide(item: GalleryItem) {
    await supabase.from("gallery").update({ is_hidden: !item.is_hidden }).eq("id", item.id);
    load();
  }

  async function remove(item: GalleryItem) {
    if (!confirm("Delete this image?")) return;
    await supabase.from("gallery").delete().eq("id", item.id);
    load();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold text-white">Gallery</h1>

      <div className="glass-card mb-6 p-6">
        <h2 className="mb-4 font-semibold text-white">Add Image</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="input-field" placeholder="Batch Name (optional)" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
          <input className="input-field" placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <label className="btn-outline flex cursor-pointer justify-center !py-2 text-sm">
            <UploadCloud size={16} /> {file ? file.name : "Choose Image"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <button onClick={upload} disabled={!file || uploading} className="btn-primary mt-4 !py-2">
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <p className="mb-3 text-xs text-slate-500">
        These photos appear on the homepage as an auto-advancing slideshow (a new picture every 10 seconds). Hidden
        images are skipped in the slideshow.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((img) => (
          <div key={img.id} className="glass-card overflow-hidden p-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.image_url} alt={img.caption ?? ""} className="aspect-square w-full object-cover" />
            <div className="p-3">
              <p className="truncate text-xs text-slate-300">{img.batch_name ?? "—"}</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => toggleHide(img)} className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10">
                  <EyeOff size={12} /> {img.is_hidden ? "Unhide" : "Hide"}
                </button>
                <button onClick={() => remove(img)} className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
