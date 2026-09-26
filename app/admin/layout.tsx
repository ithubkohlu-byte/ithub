"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, Layers, Users, Hash, FileText, Image as ImageIcon,
  Settings, LogOut, Menu, X, GraduationCap,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/batches", label: "Batches", icon: Layers },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/roll-numbers", label: "Roll Numbers", icon: Hash },
  { href: "/admin/content", label: "Home Content", icon: FileText },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/admin-login");
      const { data: adminRow } = await supabase.from("admins").select("id").eq("id", user.id).maybeSingle();
      if (!adminRow) { await supabase.auth.signOut(); return router.replace("/admin-login"); }
      setChecked(true);
    })();
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin-login");
  }

  if (!checked) return <div className="min-h-screen bg-base" />;

  return (
    <div className="min-h-screen bg-base flex">
      <aside className={`fixed lg:static z-40 h-screen w-64 glass border-r border-white/10 flex flex-col transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center gap-2 px-6 h-16 border-b border-white/10">
          <span className="h-9 w-9 rounded-lg bg-neon-gradient flex items-center justify-center shadow-glow">
            <GraduationCap size={18} className="text-white" />
          </span>
          <span className="font-bold text-gradient">IT HUB Admin</span>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "bg-neon-gradient text-white shadow-glow" : "text-white/60 hover:bg-white/5"
                }`}
              >
                <Icon size={17} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/5">
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-0">
        <div className="lg:hidden flex items-center justify-between h-16 px-4 glass border-b border-white/10">
          <span className="font-bold text-gradient">IT HUB Admin</span>
          <button onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
