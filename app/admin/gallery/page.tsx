"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Upload, Eye, EyeOff, Trash2, Loader2 } from "lucide-react";

export default function AdminGalleryPage() {
  const supabase = createClient();
  const [images, setImages] = useState<any[]>([]);
  const [batchName, setBatchName] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("gallery").select("*").order("created_at", { ascending: false });
    setImages(data || []);
  }

  async function handleUpload() {
    if (!file) return toast.error("Choose an image first");
    setUploading(true);
    const path = `${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("gallery_images").upload(path, file);
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { data: urlData } = supabase.storage.from("gallery_images").getPublicUrl(path);
    const { error } = await supabase.from("gallery").insert({
      image_url: urlData.publicUrl, batch_name: batchName, caption, is_visible: true,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Image uploaded");
    setFile(null); setBatchName(""); setCaption("");
    load();
  }

  async function toggleVisible(img: any) {
    await supabase.from("gallery").update({ is_visible: !img.is_visible }).eq("id", img.id);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this image?")) return;
    await supabase.from("gallery").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Gallery</h1>

      <div className="glass rounded-2xl p-6 mb-8 grid sm:grid-cols-2 gap-4">
        <label className="glass px-4 py-3 rounded-lg text-sm cursor-pointer text-center sm:col-span-2">
          {file ? file.name : "Choose Image"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <input placeholder="Batch Name (optional)" value={batchName} onChange={(e) => setBatchName(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm" />
        <input placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm" />
        <button onClick={handleUpload} disabled={uploading} className="btn-neon text-white py-2.5 rounded-lg font-medium sm:col-span-2 flex items-center justify-center gap-2">
          {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} Upload
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((img) => (
          <div key={img.id} className="glass rounded-xl overflow-hidden">
            <img src={img.image_url} alt={img.caption} className="h-40 w-full object-cover" />
            <div className="p-3">
              <p className="text-xs text-white/50">{img.batch_name || "—"}</p>
              <p className="text-sm">{img.caption}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => toggleVisible(img)} className="glass px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
                  {img.is_visible ? <Eye size={14} /> : <EyeOff size={14} />} {img.is_visible ? "Visible" : "Hidden"}
                </button>
                <button onClick={() => handleDelete(img.id)} className="glass px-3 py-1.5 rounded-lg text-xs text-red-300">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
