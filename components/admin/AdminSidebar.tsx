"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard, Users, BookOpen, CalendarDays, Image as ImageIcon,
  MessageSquare, Settings, LogOut, ShieldCheck, Hash, Layers, Wifi,
  Globe, FileText, CreditCard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/admin",                label: "Dashboard",     icon: LayoutDashboard },
  { href: "/admin/students",       label: "Students",      icon: Users },
  { href: "/admin/courses",        label: "Courses",       icon: BookOpen },
  { href: "/admin/batches",        label: "Batches",       icon: CalendarDays },
  { href: "/admin/roll-numbers",   label: "Roll Numbers",  icon: Hash },
  { href: "/admin/id-cards",       label: "ID Cards",      icon: CreditCard },
  { href: "/admin/results",        label: "Results",       icon: Layers },
  { href: "/admin/shortlist",      label: "Shortlist",     icon: ShieldCheck },
  { href: "/admin/gallery",        label: "Gallery",       icon: ImageIcon },
  { href: "/admin/feedback",       label: "Feedback",      icon: MessageSquare },
  { href: "/admin/content",        label: "Content",       icon: Globe },
  { href: "/admin/site-pages",     label: "Pages",         icon: FileText },
  { href: "/admin/settings",       label: "Settings",      icon: Settings },
];

export default function AdminSidebar({ logoUrl, instituteName = "IT HUB KOHLU" }: { logoUrl?: string | null; instituteName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className="flex h-screen w-60 flex-col"
      style={{
        background: "rgba(5,7,13,0.95)",
        borderRight: "1px solid rgba(34,211,238,0.1)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Top accent */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg,transparent,rgba(34,211,238,0.5),transparent)" }} />

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b" style={{ borderColor: "rgba(34,211,238,0.08)" }}>
        {logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logoUrl} alt="IT HUB KOHLU" className="h-8 w-8 rounded-lg object-contain" />
        ) : (
          <div className="relative flex h-8 w-8 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-cyan-400/25" style={{ animation: "rotate-ring 8s linear infinite" }} />
            <Wifi size={14} className="text-cyan-400" />
          </div>
        )}
        <div className="overflow-hidden">
          <p className="font-display text-xs font-bold truncate neon-text" style={{ letterSpacing: "0.1em" }}>
            {instituteName}
          </p>
          <p className="text-[9px] uppercase tracking-widest text-slate-600" style={{ fontFamily: "var(--font-mono)" }}>
            Admin Portal
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scroll-thin">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all mb-0.5",
                active
                  ? "text-cyan-300 font-semibold"
                  : "text-slate-500 hover:text-slate-200"
              )}
              style={{
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.04em",
                background: active ? "rgba(34,211,238,0.07)" : undefined,
                border: active ? "1px solid rgba(34,211,238,0.15)" : "1px solid transparent",
              }}
            >
              <Icon size={14} className={active ? "text-cyan-400" : "text-slate-600"} />
              {label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 5px #22d3ee" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t p-3" style={{ borderColor: "rgba(34,211,238,0.08)" }}>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-500 transition hover:text-red-400"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}
        >
          <LogOut size={14} />
          SIGN OUT
        </button>
      </div>
    </aside>
  );
}
