"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [hasRollNumbers, setHasRollNumbers] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("roll_numbers")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setHasRollNumbers(!!count && count > 0));
  }, []);

  const links = [
    { href: "/#home", label: "Home" },
    { href: "/#courses", label: "Courses" },
    { href: "/#batches", label: "Batches" },
    { href: "/#gallery", label: "Gallery" },
    { href: "/#contact", label: "Contact" },
    ...(hasRollNumbers ? [{ href: "/roll-slip", label: "Roll No Slip" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="h-9 w-9 rounded-lg bg-neon-gradient flex items-center justify-center shadow-glow">
            <GraduationCap size={20} className="text-white" />
          </span>
          <span className="text-gradient">IT HUB KOHLU</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-accent transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium btn-neon text-white"
          >
            Student Login
          </Link>
        </div>

        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="md:hidden glass border-t border-white/10 px-4 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-white/80" onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <Link href="/login" className="px-4 py-2 rounded-lg text-center btn-neon text-white">
            Student Login
          </Link>
        </div>
      )}
    </header>
  );
}
