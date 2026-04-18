"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  FilePlus,
  FileText,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", Icon: FileText },
  { href: "/proposals", label: "Proposals", Icon: FilePlus },
  { href: "/pipeline", label: "Pipeline", Icon: TrendingUp },
  { href: "/clients", label: "Clients", Icon: Users },
  { href: "/services", label: "Services", Icon: Briefcase },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav">
      {nav.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`nav-item${active ? " active" : ""}`}
          >
            <Icon
              size={16}
              strokeWidth={1.75}
              style={{
                color: active ? "var(--accent)" : "var(--muted)",
                flexShrink: 0,
              }}
              aria-hidden
            />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
