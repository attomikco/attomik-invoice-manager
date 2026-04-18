import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarSignOut from "./sidebar-sign-out";

const nav = [
  { href: "/dashboard", label: "Dashboard", code: "00" },
  { href: "/invoices", label: "Invoices", code: "01" },
  { href: "/proposals", label: "Proposals", code: "02" },
  { href: "/pipeline", label: "Pipeline", code: "03" },
  { href: "/clients", label: "Clients", code: "04" },
  { href: "/services", label: "Services", code: "05" },
  { href: "/settings", label: "Settings", code: "06" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex bg-bg">
      <aside className="w-64 bg-sidebar text-white flex flex-col shrink-0">
        <div className="px-6 pt-8 pb-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-accent rounded-full" />
            <span className="mono text-[10px] tracking-widest text-white/50 uppercase">
              Attomik HQ
            </span>
          </div>
          <div className="mono text-[10px] tracking-widest text-white/30 uppercase">
            v1.0
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
            >
              <span className="mono text-[10px] text-white/30 group-hover:text-accent">
                {item.code}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10">
          <div className="mono text-[10px] uppercase tracking-widest text-white/30 mb-1">
            Signed in
          </div>
          <div className="text-xs text-white/70 mono truncate mb-4">
            {user.email}
          </div>
          <SidebarSignOut />
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
