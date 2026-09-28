import Link from "next/link";
import { Calendar, Users, Cpu } from "lucide-react";
import type { Batch } from "@/types";

type BatchRow = Batch & { course_names?: string[] };

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BatchesSection({ batches }: { batches: BatchRow[] }) {
  const announced = batches.filter((b) => b.is_announced);
  if (announced.length === 0) return null;

  return (
    <section id="batches" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <div className="mb-12 text-center">
        <span className="tech-badge mb-4 inline-flex">
          <Users size={12} /> BATCHES
        </span>
        <h2 className="section-heading">Current &amp; upcoming batches</h2>
        <p className="mt-3 text-slate-400 max-w-xl mx-auto" style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
          <span className="text-cyan-400/50">// </span>Seats are limited — enroll before they fill up.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {announced.map((b) => {
          const left = Math.max(b.seats_total - b.seats_filled, 0);
          const closed = b.status === "closed" || left === 0;
          const pct = Math.min((b.seats_filled / b.seats_total) * 100, 100);
          return (
            <div key={b.id} className="glass-card p-6 relative overflow-hidden">
              {/* Top status line */}
              <div
                className="absolute left-0 right-0 top-0 h-0.5"
                style={{ background: closed ? "rgba(239,68,68,0.4)" : "linear-gradient(90deg,#22d3ee,#3b82f6,#7c6cf6)" }}
              />

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-white" style={{ letterSpacing: "0.04em" }}>
                    {b.batch_name}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(b.course_names?.length ? b.course_names : [b.course_name]).map((c) => (
                      <span
                        key={c}
                        className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-300/80"
                        style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.15)", fontFamily: "var(--font-mono)" }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: closed ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
                    color: closed ? "#fca5a5" : "#6ee7b7",
                    border: `1px solid ${closed ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}`,
                  }}
                >
                  {closed ? "FULL" : "OPEN"}
                </span>
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400" style={{ fontFamily: "var(--font-mono)" }}>
                <Calendar size={11} className="text-cyan-400/60" />
                {fmt(b.start_date)} — {fmt(b.end_date)}
              </p>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${pct}%`,
                      background: pct > 80
                        ? "linear-gradient(90deg,#ef4444,#f97316)"
                        : "linear-gradient(90deg,#22d3ee,#3b82f6)",
                      boxShadow: `0 0 8px ${pct > 80 ? "rgba(239,68,68,0.5)" : "rgba(34,211,238,0.4)"}`,
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-slate-500" style={{ fontFamily: "var(--font-mono)" }}>
                  <span>{b.seats_filled}/{b.seats_total} enrolled</span>
                  <span className={left < 10 ? "text-red-400" : ""}>{left} remaining</span>
                </div>
              </div>

              <Link
                href="/apply"
                className={`mt-5 block rounded-lg py-2.5 text-center text-xs font-bold uppercase tracking-widest transition ${
                  closed
                    ? "cursor-not-allowed bg-white/5 text-slate-600"
                    : "bg-neon-line text-base-950 hover:brightness-110 shadow-neon"
                }`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {closed ? "SEATS FULL" : "ENROLL NOW"}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
