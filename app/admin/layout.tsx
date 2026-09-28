import AdminSidebar from "@/components/admin/AdminSidebar";
import { createClient } from "@/lib/supabase/server";

// Auth + admin-role guard is enforced in middleware.ts for all /admin/* routes.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data } = await supabase.from("home_content").select("logo_url, institute_name").eq("id", 1).maybeSingle();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar logoUrl={data?.logo_url as string | undefined} instituteName={data?.institute_name as string | undefined} />
      <main className="flex-1 overflow-x-hidden p-4 md:p-8">{children}</main>
    </div>
  );
}
