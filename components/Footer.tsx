import { Mail, MapPin, Phone, Wifi, CheckCircle2, Github, Globe } from "lucide-react";
import Link from "next/link";
import type { HomeContent } from "@/types";

export default function Footer({ content }: { content: HomeContent }) {
  const year = new Date().getFullYear();

  return (
    <>
      {/* About section */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass-card p-8 relative overflow-hidden">
            <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle,#22d3ee,transparent 70%)" }} />
            <span className="tech-badge mb-4 inline-flex"><Globe size={11} /> ABOUT</span>
            <h2 className="section-heading text-2xl">About IT HUB KOHLU</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400" style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
              {content.about_text}
            </p>
          </div>
          <div className="glass-card p-8 relative overflow-hidden">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle,#3b82f6,transparent 70%)" }} />
            <span className="tech-badge mb-4 inline-flex"><CheckCircle2 size={11} /> WHY US</span>
            <h2 className="section-heading text-2xl">Why Choose Us</h2>
            <ul className="mt-4 space-y-3">
              {content.why_choose_us_points?.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-base-950"
                    style={{ background: "linear-gradient(135deg,#22d3ee,#3b82f6)", fontFamily: "var(--font-mono)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="relative border-t" style={{ borderColor: "rgba(34,211,238,0.1)" }}>
        {/* Top glow line */}
        <div className="absolute left-0 right-0 top-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(34,211,238,0.4),transparent)" }} />

        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <div className="flex flex-col items-start justify-between gap-10 md:flex-row">
            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 font-display font-bold text-white" style={{ letterSpacing: "0.05em" }}>
                {content.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={content.logo_url} alt="IT HUB KOHLU" className="h-9 w-9 rounded-lg object-contain" />
                ) : (
                  <div className="relative flex h-9 w-9 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-cyan-400/30" style={{ animation: "rotate-ring 8s linear infinite" }} />
                    <Wifi size={16} className="text-cyan-400" />
                  </div>
                )}
                <span className="neon-text">{content.institute_name || "IT HUB KOHLU"}</span>
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed" style={{ fontFamily: "var(--font-mono)" }}>
                Practical tech education. Real-world portfolios. Careers that start on day one.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                <a href="#reviews" className="text-cyan-300/70 hover:text-cyan-300 transition-colors" style={{ fontFamily: "var(--font-mono)" }}>
                  Reviews
                </a>
                <Link href="/login" className="text-slate-500 hover:text-white transition-colors" style={{ fontFamily: "var(--font-mono)" }}>
                  Student Portal
                </Link>
              </div>
            </div>

            {/* Quick nav */}
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-widest text-cyan-400/60" style={{ fontFamily: "var(--font-mono)" }}>
                Navigation
              </p>
              <ul className="space-y-2 text-xs text-slate-400" style={{ fontFamily: "var(--font-mono)" }}>
                {["/#courses", "/#batches", "/#gallery", "/#reviews", "/apply"].map((href) => (
                  <li key={href}>
                    <a href={href} className="hover:text-cyan-300 transition-colors">
                      <span className="text-cyan-600/40 mr-1">&gt;</span>
                      {href.replace("/#", "").replace("/", "").charAt(0).toUpperCase() + href.replace("/#", "").replace("/", "").slice(1)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-3 text-xs text-slate-400" style={{ fontFamily: "var(--font-mono)" }}>
              <p className="mb-3 text-[10px] uppercase tracking-widest text-cyan-400/60">
                Contact
              </p>
              <div className="flex items-center gap-2">
                <Phone size={13} className="shrink-0 text-cyan-400/70" />
                {content.contact_phone}
              </div>
              <div className="flex items-center gap-2">
                <Mail size={13} className="shrink-0 text-cyan-400/70" />
                {content.contact_email ? (
                  <a href={`mailto:${content.contact_email}`} className="hover:text-cyan-300 transition-colors">
                    {content.contact_email}
                  </a>
                ) : content.contact_email}
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 shrink-0 text-cyan-400/70" />
                {content.contact_address}
              </div>
            </div>
          </div>

          {/* Developer credit — large and fully visible */}
          {content.developer_name && (
            <div className="mt-12 border-t pt-10 text-center" style={{ borderColor: "rgba(34,211,238,0.12)" }}>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-400/70" style={{ fontFamily: "var(--font-mono)" }}>
                Developed by
              </p>
              <p className="neon-text mt-2 font-display text-3xl font-bold text-white md:text-5xl">
                {content.developer_name}
              </p>
            </div>
          )}

          {/* Bottom bar */}
          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-slate-400 md:flex-row" style={{ borderColor: "rgba(255,255,255,0.06)", fontFamily: "var(--font-mono)" }}>
            <span>
              © {year} {content.institute_name || "IT HUB KOHLU"}. All rights reserved.
            </span>
            {!content.developer_name && <span>Powered by {content.institute_name || "IT HUB KOHLU"}</span>}
          </div>
        </div>
      </footer>
    </>
  );
}
