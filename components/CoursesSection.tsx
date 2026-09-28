"use client";

import Link from "next/link";
import { useState } from "react";
import { Code2, Palette, Megaphone, ShoppingCart, Layers, BookOpen, ArrowUpRight, Ban, Info, X, Terminal } from "lucide-react";
import type { Course } from "@/types";

const ICONS: Record<string, any> = {
  code: Code2,
  palette: Palette,
  megaphone: Megaphone,
  cart: ShoppingCart,
  layers: Layers,
  book: BookOpen,
};

export default function CoursesSection({ courses }: { courses: Course[] }) {
  const [selected, setSelected] = useState<Course | null>(null);
  if (courses.length === 0) return null;

  return (
    <section id="courses" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <div className="mb-12 text-center">
        <span className="tech-badge mb-4 inline-flex">
          <Terminal size={12} /> PROGRAMS
        </span>
        <h2 className="section-heading">Built for hiring, not just certificates</h2>
        <p className="mt-3 text-slate-400 max-w-xl mx-auto" style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
          <span className="text-cyan-400/50">// </span>Pick the track that matches where you want to work next.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {courses.map((course, idx) => {
          const Icon = ICONS[course.icon_key] ?? Code2;
          return (
            <div
              key={course.id}
              className="glass-card group flex flex-col justify-between p-6 relative overflow-hidden"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {/* Corner accent */}
              <div className="absolute right-0 top-0 h-16 w-16 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "radial-gradient(circle at top right, rgba(34,211,238,0.15), transparent 70%)" }} />

              <div>
                <div className="flex items-start justify-between">
                  <div className="hex-icon h-11 w-11" style={{ borderRadius: 10 }}>
                    <Icon size={20} strokeWidth={2.5} />
                  </div>
                  {!course.is_open && (
                    <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-semibold text-red-300">
                      <Ban size={10} /> CLOSED
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-white" style={{ letterSpacing: "0.02em" }}>
                  {course.name}
                </h3>
                {course.duration && (
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-cyan-300/70" style={{ fontFamily: "var(--font-mono)" }}>
                    {course.duration}
                  </p>
                )}
                {/* Code-comment style description */}
                <p className="mt-3 text-xs leading-relaxed text-slate-400" style={{ fontFamily: "var(--font-mono)" }}>
                  <span className="text-green-400/50">/* </span>
                  {course.description || "Details coming soon."}
                  <span className="text-green-400/50"> */</span>
                </p>
              </div>

              <div className="mt-6 flex items-center gap-4 border-t border-white/5 pt-4">
                {course.is_open ? (
                  <Link
                    href="/apply"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 group-hover:text-cyan-200 transition-colors"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    ENROLL <ArrowUpRight size={13} />
                  </Link>
                ) : (
                  <span className="text-xs font-semibold text-slate-600" style={{ fontFamily: "var(--font-mono)" }}>
                    CLOSED
                  </span>
                )}
                {course.full_info?.trim() && (
                  <button
                    onClick={() => setSelected(course)}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors ml-auto"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    <Info size={12} /> INFO
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass-card max-h-[80vh] w-full max-w-lg overflow-y-auto scroll-thin p-6"
            style={{ border: "1px solid rgba(34,211,238,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">{selected.name}</h3>
                {selected.duration && (
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-cyan-300/70" style={{ fontFamily: "var(--font-mono)" }}>
                    {selected.duration}
                  </p>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="shrink-0 text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300" style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
              {selected.full_info}
            </p>
            {selected.is_open && (
              <Link href="/apply" className="btn-primary mt-6 inline-flex !w-auto !py-2 !text-sm">
                ENROLL NOW <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
