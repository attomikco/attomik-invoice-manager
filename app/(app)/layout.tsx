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
    <div className="app-layout">
      <aside className="sidebar">
        <div
          className="sidebar-logo"
          style={{
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "var(--sp-1)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="pulse-dot" />
            <span
              className="mono"
              style={{
                fontSize: "var(--fs-10)",
                letterSpacing: "var(--ls-widest)",
                textTransform: "uppercase",
                color: "var(--white-a50)",
              }}
            >
              Attomik HQ
            </span>
          </div>
          <span
            className="mono"
            style={{
              fontSize: "var(--fs-10)",
              letterSpacing: "var(--ls-widest)",
              textTransform: "uppercase",
              color: "var(--white-a30)",
            }}
          >
            v1.0
          </span>
        </div>

        <nav className="sidebar-nav">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="nav-item">
              <span
                className="mono"
                style={{
                  fontSize: "var(--fs-10)",
                  color: "var(--white-a30)",
                  width: 18,
                  flexShrink: 0,
                }}
              >
                {item.code}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div
          className="sidebar-footer"
          style={{ flexDirection: "column", alignItems: "stretch" }}
        >
          <div
            className="mono"
            style={{
              fontSize: "var(--fs-10)",
              letterSpacing: "var(--ls-widest)",
              textTransform: "uppercase",
              color: "var(--white-a30)",
            }}
          >
            Signed in
          </div>
          <div
            className="mono truncate"
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--white-a70)",
              marginTop: "var(--sp-1)",
              marginBottom: "var(--sp-3)",
            }}
          >
            {user.email}
          </div>
          <SidebarSignOut />
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
