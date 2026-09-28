"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const REVEAL = "section > div, .glass-card, .section-heading, .tech-badge, [data-reveal]";

/**
 * Site-wide interactivity, no per-component edits needed:
 * scroll progress bar, cursor glow, scroll-reveal with stagger, 3D tilt + spotlight
 * on .glass-card, magnetic + ripple buttons, count-up numbers.
 */
export default function FxLayer() {
  const pathname = usePathname();

  // ---------- scroll-reveal + count-up (re-run on every route change) ----------
  useIso(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const vh = window.innerHeight;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("fx-in");
          io.unobserve(el);
          el.querySelectorAll<HTMLElement>("[data-count]").forEach(countUp);
          if (el.matches("[data-count]")) countUp(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    const seen = new Set<Element>();
    document.querySelectorAll<HTMLElement>(REVEAL).forEach((el) => {
      if (seen.has(el) || el.closest("header,nav,.au-root")) return;
      const pos = getComputedStyle(el).position;
      if (pos === "absolute" || pos === "fixed") return; // never touch positioned decorations
      // a card inside a revealed parent is staggered via --d instead of double-hiding
      const sibs = el.parentElement ? Array.from(el.parentElement.children) : [];
      el.style.setProperty("--d", `${Math.min(sibs.indexOf(el), 8) * 80}ms`);
      if (el.getBoundingClientRect().top < vh * 0.9) return; // already visible: leave untouched
      seen.add(el);
      el.classList.add("fx-hide");
      io.observe(el);
    });
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    const fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;

    // ---------- scroll progress ----------
    const bar = document.getElementById("fx-progress");
    const onScroll = () => {
      const max = root.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    if (!fine || still) return () => window.removeEventListener("scroll", onScroll);

    // ---------- pointer effects (one delegated listener) ----------
    const glow = document.getElementById("fx-glow");
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (glow) glow.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      const t = e.target as HTMLElement;
      const card = t.closest?.(".glass-card") as HTMLElement | null;
      if (card && !card.closest(".au-root")) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          card.style.setProperty("--sx", `${x * 100}%`);
          card.style.setProperty("--sy", `${y * 100}%`);
          if (r.width < 520) card.style.transform = `perspective(900px) rotateY(${(x - 0.5) * 9}deg) rotateX(${(0.5 - y) * 9}deg) translateY(-4px)`;
        });
      }
      const btn = t.closest?.(".btn-primary,.btn-outline") as HTMLElement | null;
      if (btn) {
        const r = btn.getBoundingClientRect();
        btn.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.18}px ${(e.clientY - r.top - r.height / 2) * 0.28}px`;
      }
    };
    const onOut = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      const card = t.closest?.(".glass-card") as HTMLElement | null;
      if (card && !card.contains(e.relatedTarget as Node)) card.style.transform = "";
      const btn = t.closest?.(".btn-primary,.btn-outline") as HTMLElement | null;
      if (btn && !btn.contains(e.relatedTarget as Node)) btn.style.translate = "";
    };
    const onDown = (e: PointerEvent) => {
      const btn = (e.target as HTMLElement).closest?.(".btn-primary,.btn-outline") as HTMLElement | null;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const s = document.createElement("span");
      s.className = "fx-ripple";
      s.style.left = `${e.clientX - r.left}px`;
      s.style.top = `${e.clientY - r.top}px`;
      btn.appendChild(s);
      setTimeout(() => s.remove(), 650);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <>
      <div id="fx-progress" aria-hidden="true" />
      <div id="fx-glow" aria-hidden="true" />
    </>
  );
}

function countUp(el: HTMLElement) {
  if (el.dataset.done) return;
  el.dataset.done = "1";
  const raw = el.dataset.count ?? el.textContent ?? "";
  const m = raw.match(/-?\d+(\.\d+)?/);
  if (!m) return;
  const end = parseFloat(m[0]);
  const [pre, post] = [raw.slice(0, m.index), raw.slice((m.index ?? 0) + m[0].length)];
  const dec = (m[1] ?? "").length - (m[1] ? 1 : 0);
  const t0 = performance.now();
  const tick = (t: number) => {
    const p = Math.min((t - t0) / 1400, 1);
    el.textContent = `${pre}${(end * (1 - Math.pow(1 - p, 3))).toFixed(dec)}${post}`;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
