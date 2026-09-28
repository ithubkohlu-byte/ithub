"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Home, GraduationCap, BookOpen, Layers, Image as ImageIcon, Star, Ticket, CreditCard, FileText, Mail, LogIn, Hexagon, Wifi,
  type LucideIcon,
} from "lucide-react";
import type { SitePage } from "@/types";

const HILL_W = 92; // width of the red "hill" that rises over the active tab
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Item = { href: string; label: string; icon: LucideIcon };

export default function Navbar({
  showRollSlipLink,
  showIdCardLink,
  showResultsLink,
  logoUrl,
  instituteName = "IT HUB KOHLU",
  sitePages = [],
}: {
  showRollSlipLink: boolean;
  showIdCardLink?: boolean;
  showResultsLink?: boolean;
  logoUrl?: string | null;
  instituteName?: string;
  sitePages?: SitePage[];
}) {
  const pathname = usePathname();

  const links: Item[] = [
    { href: "/#home", label: "Home", icon: Home },
    { href: "/#courses", label: "Courses", icon: BookOpen },
    { href: "/#batches", label: "Batches", icon: Layers },
    { href: "/#gallery", label: "Gallery", icon: ImageIcon },
    { href: "/#reviews", label: "Reviews", icon: Star },
    ...(showRollSlipLink ? [{ href: "/roll-slip", label: "Roll Slip", icon: Ticket }] : []),
    ...(showResultsLink ? [{ href: "/result", label: "Results", icon: GraduationCap }] : []),
    ...(showIdCardLink ? [{ href: "/id-card", label: "ID Card", icon: CreditCard }] : []),
    ...sitePages.map((p) => ({ href: `/page/${p.slug}`, label: p.title, icon: FileText })),
    { href: "/#contact", label: "Contact", icon: Mail },
  ];
  const linksKey = links.map((l) => l.href).join("|");

  // ---- which tab is active? (scroll-spy on the home page, pathname elsewhere) ----
  const [hash, setHash] = useState("home");
  useEffect(() => {
    if (pathname !== "/") return;
    const ids = links.filter((l) => l.href.startsWith("/#")).map((l) => l.href.slice(2));
    const onScroll = () => {
      let cur = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) cur = id;
      }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = ids[ids.length - 1];
      setHash(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, linksKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeHref =
    pathname === "/"
      ? `/#${hash}`
      : links.find((l) => !l.href.includes("#") && (pathname === l.href || pathname.startsWith(l.href + "/")))?.href ?? null;

  // ---- position the red hill under the active tab ----
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pos, setPos] = useState<{ c: number; ready: boolean }>({ c: 0, ready: false });

  function measure(scroll = true) {
    const el = activeHref ? tabRefs.current[activeHref] : null;
    if (!el) return setPos((p) => ({ ...p, ready: false }));
    const c = el.offsetLeft + el.offsetWidth / 2;
    setPos({ c, ready: true });
    const sc = scrollRef.current;
    if (scroll && sc && sc.scrollWidth > sc.clientWidth) {
      sc.scrollTo({ left: c - sc.clientWidth / 2, behavior: "smooth" });
    }
  }
  useIso(() => { measure(); }, [activeHref, linksKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onResize = () => measure(false);
    window.addEventListener("resize", onResize);
    (document as any).fonts?.ready?.then(() => measure(false));
    return () => window.removeEventListener("resize", onResize);
  }, [activeHref, linksKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const left = pos.c - HILL_W / 2;

  return (
    <header className="nv-header">
      <div className="nv-wrap">
        {/* Logo */}
        <Link href="/" className="nv-logo">
          {logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logoUrl} alt={instituteName} />
          ) : (
            <span className="nv-logo-mark">
              <Hexagon size={34} className="nv-hex" />
              <Wifi size={15} />
            </span>
          )}
          <span className="nv-logo-text">{instituteName}</span>
        </Link>

        {/* Tabs */}
        <div className="nv-scroll" ref={scrollRef}>
          <nav className="nv-track" aria-label="Main">
            {links.map((l) => {
              const active = l.href === activeHref;
              const Icon = l.icon;
              return (
                <a
                  key={l.href}
                  href={l.href}
                  ref={(el) => { tabRefs.current[l.href] = el; }}
                  data-active={active ? "true" : "false"}
                  aria-current={active ? "page" : undefined}
                  onClick={() => { if (l.href.startsWith("/#") && pathname === "/") setHash(l.href.slice(2)); }}
                  className="nv-tab"
                >
                  <span className="nv-ic">
                    <Icon size={19} strokeWidth={1.9} className="nv-icon" />
                    <span className="nv-dot" />
                  </span>
                  <span className="nv-label">{l.label}</span>
                </a>
              );
            })}

            {/* red outline: bottom line + hill that slides to the active tab */}
            <span className="nv-line" style={{ left: 0, width: pos.ready ? Math.max(left, 0) : "100%" }} />
            <span className="nv-line" style={{ left: pos.ready ? left + HILL_W : "100%", right: 0 }} />
            <svg
              className="nv-hill"
              width={HILL_W}
              height={38}
              viewBox={`0 0 ${HILL_W} 38`}
              style={{ transform: `translateX(${left}px)`, opacity: pos.ready ? 1 : 0 }}
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="nvg" cx="50%" cy="100%" r="80%">
                  <stop offset="0" stopColor="#ff2a2a" stopOpacity=".38" />
                  <stop offset="1" stopColor="#ff2a2a" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path d="M0 37 C19 37 21 3 46 3 C71 3 73 37 92 37 Z" fill="url(#nvg)" />
              <path d="M0 37 C19 37 21 3 46 3 C71 3 73 37 92 37" fill="none" stroke="#ff2a2a" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </nav>
        </div>

        <Link href="/login" className="nv-login">
          <LogIn size={15} /> <span>Student Login</span>
        </Link>
      </div>
    </header>
  );
}
