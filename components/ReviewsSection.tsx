import { Star, Quote } from "lucide-react";
import type { Feedback } from "@/types";

export default function ReviewsSection({ reviews }: { reviews: Feedback[] }) {
  if (reviews.length === 0) return null;

  return (
    <section id="reviews" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <div className="mb-12 text-center">
        <span className="tech-badge mb-4 inline-flex">
          <Star size={12} /> TESTIMONIALS
        </span>
        <h2 className="section-heading">Student Reviews</h2>
        <p className="mt-3 text-slate-400" style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
          <span className="text-cyan-400/50">// </span>What our students say about IT HUB KOHLU.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <div key={r.id} className="glass-card flex flex-col p-6 relative overflow-hidden">
            {/* Background glow */}
            <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #22d3ee, transparent 70%)" }} />

            <Quote size={20} className="mb-3 text-cyan-400/40" />

            {r.rating !== null && (
              <span className="mb-3 flex items-center gap-0.5">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                ))}
              </span>
            )}

            <p className="flex-1 text-sm leading-relaxed text-slate-300">{r.message}</p>

            <div className="mt-4 border-t border-white/5 pt-4 flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-base-950"
                style={{ background: "linear-gradient(135deg,#22d3ee,#3b82f6)" }}
              >
                {(r.student_name ?? "S")[0].toUpperCase()}
              </div>
              <p className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>
                {r.student_name ?? "IT HUB KOHLU Student"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
