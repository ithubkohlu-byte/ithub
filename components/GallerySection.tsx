"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryItem } from "@/types";

const SLIDE_INTERVAL_MS = 10000; // change slide every 10 seconds

export default function GallerySection({ images }: { images: GalleryItem[] }) {
  const [filter, setFilter] = useState<string>("All");
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [paused, setPaused] = useState(false);

  const batchNames = useMemo(
    () => ["All", ...Array.from(new Set(images.map((i) => i.batch_name).filter(Boolean) as string[]))],
    [images]
  );

  const filtered = useMemo(
    () => (filter === "All" ? images : images.filter((i) => i.batch_name === filter)),
    [images, filter]
  );

  // Reset to the first slide whenever the visible set of images changes (e.g. filter change).
  useEffect(() => {
    setIndex(0);
  }, [filter, images.length]);

  // Auto-advance the slideshow every 10 seconds. Pauses while the lightbox is
  // open or the user is hovering/holding the slide, and stops cleanly when
  // there's nothing (or only one image) to rotate through.
  useEffect(() => {
    if (filtered.length <= 1 || lightbox || paused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % filtered.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [filtered.length, lightbox, paused]);

  if (images.length === 0) return null;
  const active = filtered[index];

  function goTo(i: number) {
    setIndex(((i % filtered.length) + filtered.length) % filtered.length);
  }

  return (
    <section id="gallery" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="section-heading">Life at IT HUB KOHLU</h2>
          <p className="mt-3 text-slate-400">Moments from our classrooms, workshops and convocations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {batchNames.map((b) => (
            <button
              key={b}
              onClick={() => setFilter(b)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                filter === b
                  ? "border-neon-cyan/60 bg-neon-cyan/10 text-cyan-200"
                  : "border-white/10 text-slate-400 hover:border-white/25"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div
          className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 sm:aspect-video"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {filtered.map((img, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={img.id}
              src={img.image_url}
              alt={img.caption ?? "Gallery image"}
              className={`absolute inset-0 h-full w-full cursor-zoom-in object-cover transition-opacity duration-700 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
              onClick={() => setLightbox(true)}
            />
          ))}

          {(active.caption || active.batch_name) && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-sm text-white">
              {active.caption}
              {active.batch_name && <span className="ml-2 text-xs text-cyan-300">{active.batch_name}</span>}
            </div>
          )}

          {filtered.length > 1 && (
            <>
              <button
                aria-label="Previous image"
                onClick={() => goTo(index - 1)}
                className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                aria-label="Next image"
                onClick={() => goTo(index + 1)}
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
              >
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {filtered.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => goTo(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? "w-5 bg-cyan-300" : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {active && filtered.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto scroll-thin pb-1">
          {filtered.map((img, i) => (
            <button
              key={img.id}
              onClick={() => goTo(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition sm:h-20 sm:w-20 ${
                i === index ? "border-neon-cyan/70" : "border-white/10 opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox && active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          <button className="absolute right-5 top-5 text-white/70 hover:text-white" onClick={() => setLightbox(false)}>
            <X size={28} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.image_url}
            alt={active.caption ?? ""}
            className="max-h-[85vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
