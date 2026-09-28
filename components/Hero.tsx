"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, MegaphoneOff, Terminal, Cpu, Wifi } from "lucide-react";

export default function Hero({
  title,
  subtitle,
  admissionOpen,
}: {
  title: string;
  subtitle: string;
  admissionOpen: boolean;
}) {
  const router = useRouter();
  const [showClosedNotice, setShowClosedNotice] = useState(false);
  const [typedTitle, setTypedTitle] = useState("");
  const [titleDone, setTitleDone] = useState(false);
  const [counter, setCounter] = useState({ students: 0, courses: 0, placement: 0 });

  // Typewriter effect for title
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= title.length) {
        setTypedTitle(title.slice(0, i));
        i++;
      } else {
        setTitleDone(true);
        clearInterval(interval);
      }
    }, 45);
    return () => clearInterval(interval);
  }, [title]);

  // Counter animation
  useEffect(() => {
    const targets = { students: 1200, courses: 8, placement: 95 };
    const duration = 1800;
    const steps = 60;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const p = Math.min(step / steps, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCounter({
        students: Math.round(targets.students * ease),
        courses:  Math.round(targets.courses * ease),
        placement: Math.round(targets.placement * ease),
      });
      if (step >= steps) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, []);

  function handleStart() {
    if (!admissionOpen) { setShowClosedNotice(true); return; }
    router.push("/apply");
  }

  const stats = [
    { value: `${counter.students}+`, label: "Students Enrolled" },
    { value: `${counter.courses}+`, label: "Programs Available" },
    { value: `${counter.placement}%`, label: "Placement Rate" },
  ];

  return (
    <section id="home" className="relative overflow-hidden">
      {/* Ambient glow backdrop */}
      <div
        className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
        style={{
          zIndex: 0,
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(34,211,238,0.14) 0%, transparent 60%)",
        }}
      />

      {/* Scan line */}
      <div
        className="pointer-events-none absolute left-0 right-0 h-px animate-scan"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.5), transparent)",
          zIndex: 1,
        }}
      />

      {/* Animated corner brackets */}
      <div className="pointer-events-none absolute inset-4 md:inset-10" style={{ zIndex: 1 }}>
        {/* Top-left */}
        <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-cyan-400/40" />
        {/* Top-right */}
        <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-cyan-400/40" />
        {/* Bottom-left */}
        <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-cyan-400/40" />
        {/* Bottom-right */}
        <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-cyan-400/40" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 md:px-6 md:pt-28" style={{ zIndex: 2 }}>
        <div className="mx-auto max-w-3xl text-center">

          {/* Status badge */}
          <span className="tech-badge mb-6 inline-flex">
            <ShieldCheck size={12} />
            {admissionOpen ? "ADMISSIONS OPEN — 2026 BATCH" : "ADMISSIONS CLOSED"}
          </span>

          {/* Hero title — typewriter */}
          <h1
            className="font-display text-4xl font-bold leading-tight text-white md:text-6xl"
            style={{ letterSpacing: "-0.02em", minHeight: "1.2em" }}
          >
            <span
              className="neon-text"
              style={{ textShadow: "none" }}
            >
              {typedTitle}
            </span>
            {!titleDone && (
              <span
                className="inline-block w-0.5 h-[0.85em] bg-cyan-400 ml-1 align-text-bottom"
                style={{ animation: "pulse-glow 0.7s step-end infinite" }}
              />
            )}
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-400 md:text-lg" style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", lineHeight: 1.7 }}>
            <span className="text-cyan-400/60">// </span>{subtitle}
          </p>

          {showClosedNotice && (
            <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              <MegaphoneOff size={16} /> Admissions are currently closed. Please check back later.
            </div>
          )}

          {/* CTA buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button onClick={handleStart} className="btn-primary">
              <Terminal size={17} /> Start Application <ArrowRight size={17} />
            </button>
            <a href="#courses" className="btn-outline">
              <Cpu size={17} /> Explore Courses
            </a>
          </div>

          {/* Live stats */}
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="glass-card p-4 text-center animate-border-glow">
                <p data-count={String(s.value)} className="font-display text-2xl font-bold text-white md:text-3xl neon-text">
                  {s.value}
                </p>
                <p className="mt-1 text-xs text-slate-500 uppercase tracking-widest" style={{ fontFamily: "var(--font-mono)" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Technology icons row */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 opacity-50">
            {["HTML", "CSS", "JS", "React", "Python", "Figma", "PHP", "MySQL"].map((t) => (
              <span key={t} className="rounded border border-white/10 px-2.5 py-1 text-xs text-slate-400" style={{ fontFamily: "var(--font-mono)" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
