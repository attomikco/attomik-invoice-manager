# Attomik HQ — Codebase Audit

Snapshot taken 2026-04-27. Single-page Next.js 14 (App Router) app on Supabase, magic-link auth, jsPDF for documents.

---

## 1. Route structure

```
app/
├── globals.css
├── icon.png
├── layout.tsx                          # Root layout (HTML shell, fonts)
├── page.tsx                            # Redirect: → /dashboard or /login
├── auth/
│   └── callback/
│       └── route.ts                    # OAuth/magic-link code exchange
├── login/
│   └── page.tsx                        # Magic-link sign-in screen
└── (app)/                              # Auth-gated app shell
    ├── layout.tsx                      # Sidebar + main, redirects to /login if no user
    ├── sidebar-nav.tsx                 # Client component: nav links + active state
    ├── sidebar-sign-out.tsx            # Client component: sign-out button
    ├── dashboard/
    │   ├── page.tsx                    # Server component: KPIs + recent invoices
    │   ├── mrr-chart.tsx               # Client SVG bar chart
    │   └── year-selector.tsx           # Client toggle group (?year=)
    ├── invoices/
    │   ├── page.tsx                    # List + tabs + CRUD orchestration
    │   ├── invoice-form.tsx            # Modal form
    │   └── invoice-preview.tsx         # Modal preview + Send/PDF
    ├── proposals/
    │   ├── page.tsx                    # List + KPIs + CRUD + “Create agreement” flow
    │   ├── proposal-form.tsx           # Modal form
    │   └── proposal-preview.tsx        # Modal preview + PDF
    ├── agreements/
    │   ├── page.tsx                    # List + tabs + CRUD + email + sign flow
    │   ├── agreement-form.tsx          # Modal form
    │   └── agreement-preview.tsx       # Modal preview + Sign/Send/PDF
    ├── clients/
    │   └── page.tsx                    # CRUD with inline ClientModal
    ├── pipeline/
    │   └── page.tsx                    # Active/paused/warm/ideas + target MRR
    ├── services/
    │   └── page.tsx                    # CRUD with inline modal
    └── settings/
        └── page.tsx                    # Brand + billing + agreement defaults
```

There is no `/api` directory — every database mutation goes directly through `@supabase/ssr` clients (browser or server). All authenticated views live under the unnamed `(app)` route group.

---

## 2. Sidebar / navigation

### `app/(app)/layout.tsx`
Server component. Pulls the user from the Supabase server client and redirects to `/login` if missing. Renders the dark sidebar (inline-SVG Attomik wordmark), then `<SidebarNav />` and a footer with the user’s email and `<SidebarSignOut />`.

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SidebarSignOut from "./sidebar-sign-out";
import SidebarNav from "./sidebar-nav";

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
        <div className="sidebar-logo">
          <svg /* … inline Attomik wordmark, white fill … */ />
        </div>

        <SidebarNav />

        <div
          className="sidebar-footer"
          style={{ flexDirection: "column", alignItems: "stretch" }}
        >
          <div className="mono" style={{ /* … "Signed in" eyebrow … */ }}>
            Signed in
          </div>
          <div className="mono truncate" style={{ /* … */ }}>
            {user.email}
          </div>
          <SidebarSignOut />
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
```

> Note: The closing tags in this file appear to be `</aside></div></main>` ordering — the full text shows `</aside>` followed by `<main>` as siblings inside the same `<div className="app-layout">`. The actual source nests `<main>` outside the aside. (Confirm by reading the file directly if you’re editing.)

### `app/(app)/sidebar-nav.tsx`
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, Briefcase, FilePlus, FileSignature, FileText,
  LayoutDashboard, Settings, TrendingUp, Users, type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; Icon: LucideIcon };

const nav: NavItem[] = [
  { href: "/dashboard",  label: "Dashboard",  Icon: LayoutDashboard },
  { href: "/invoices",   label: "Invoices",   Icon: FileText },
  { href: "/proposals",  label: "Proposals",  Icon: FilePlus },
  { href: "/agreements", label: "Agreements", Icon: FileSignature },
  { href: "/pipeline",   label: "Pipeline",   Icon: TrendingUp },
  { href: "/clients",    label: "Clients",    Icon: Users },
  { href: "/services",   label: "Services",   Icon: Briefcase },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const settingsActive =
    pathname === "/settings" || pathname.startsWith("/settings/");

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
            <Icon size={16} strokeWidth={1.75}
              style={{ color: active ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}
              aria-hidden />
            <span>{label}</span>
          </Link>
        );
      })}
      <a href="/capabilities.html" target="_blank" rel="noopener noreferrer"
         className="nav-item" style={{ marginTop: "auto" }}>
        <BookOpen size={16} strokeWidth={1.75}
          style={{ color: "var(--muted)", flexShrink: 0 }} aria-hidden />
        <span>Capabilities Deck</span>
      </a>
      <Link href="/settings" className={`nav-item${settingsActive ? " active" : ""}`}>
        <Settings size={16} strokeWidth={1.75}
          style={{ color: settingsActive ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}
          aria-hidden />
        <span>Settings</span>
      </Link>
    </nav>
  );
}
```

### `app/(app)/sidebar-sign-out.tsx`
```tsx
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SidebarSignOut() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="mono"
      style={{
        background: "transparent", border: "none", padding: 0, cursor: "pointer",
        fontSize: "var(--fs-10)", letterSpacing: "var(--ls-widest)",
        textTransform: "uppercase", color: "var(--white-a50)",
        textAlign: "left", transition: "color var(--t-base)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--white-a50)")}
    >
      Sign out →
    </button>
  );
}
```

### `app/layout.tsx` (root)
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Attomik HQ",
  description: "Attomik internal operations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&family=DM+Mono&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### `middleware.ts`
```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

(Calls into `lib/supabase/middleware.ts`, which redirects unauthenticated users to `/login` and authenticated users away from `/login` to `/dashboard`.)

---

## 3. Existing module patterns

All three of Proposals, Agreements, and Clients are implemented today. Each follows the same shape: one `page.tsx` (client component) that owns the list, KPIs, and CRUD orchestration, plus a `*-form.tsx` modal and (for Proposals/Agreements) a `*-preview.tsx` modal. There are **no server actions or `/api` routes** — Supabase calls happen directly from the client.

### 3.1 Proposals

#### `app/(app)/proposals/page.tsx`
```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileSignature, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  currency, dateShort, dateISO, addDays,
  proposalPhase1Net, proposalPhase2Net,
  nextInvoiceNumber, lineSubtotal,
} from "@/lib/format";
import { ConfirmDialog } from "@/components/modal";
import {
  EMPTY_LINE, toLineItemDraft, fromLineItemDraft,
  type LineItemDraft, type Proposal, type Service, type SettingsMap,
} from "@/lib/types";
import ProposalForm, { type ProposalDraft } from "./proposal-form";
import ProposalPreview from "./proposal-preview";

function nextProposalNumber(existing: { number: string | null }[]) {
  return nextInvoiceNumber(existing, "PROP");
}

function emptyDraft(number: string): ProposalDraft {
  const today = dateISO();
  const valid = dateISO(addDays(new Date(), 30));
  return {
    number, date: today, valid_until: valid, status: "draft",
    client_name: "", client_email: "", client_company: "",
    intro: "", notes: "",
    p1_items: [{ ...EMPTY_LINE }],
    p1_discount_amount: "",
    phase1_compare: "10000", phase1_note: "",
    phase1_timeline: "20 – 45 days",
    phase1_payment: "$5k to start · $3k on launch",
    p2_items: [{ ...EMPTY_LINE }],
    phase2_title: "", p2_discount_amount: "",
    phase2_compare: "", phase2_note: "",
    phase2_commitment: "3",
  };
}

export default function ProposalsPage() {
  console.log("[proposals] ProposalsPage render");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProposalDraft | null>(null);
  const [previewing, setPreviewing] = useState<Proposal | null>(null);
  const [deleting, setDeleting] = useState<Proposal | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: servicesData } = await supabase
      .from("services").select("*").order("price", { ascending: true });
    const [{ data: props }, { data: stg }] = await Promise.all([
      supabase.from("proposals").select("*").order("number", { ascending: false }),
      supabase.from("settings").select("key, value"),
    ]);
    setProposals((props as Proposal[] | null) ?? []);
    setServices((servicesData as Service[] | null) ?? []);
    const map: SettingsMap = {};
    for (const row of (stg as { key: string; value: string }[] | null) ?? []) {
      (map as Record<string, string>)[row.key] = row.value;
    }
    setSettings(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const currencyCode = settings.currency ?? "USD";

  const stats = useMemo(() => {
    const total = proposals.length;
    const sent = proposals.filter((p) => p.status === "sent").length;
    const accepted = proposals.filter((p) => p.status === "accepted").length;
    const closed = proposals.filter((p) => p.status === "accepted" || p.status === "declined").length;
    const winRate = closed > 0 ? Math.round((accepted / closed) * 100) : 0;
    const sentProposals = proposals.filter((p) => p.status === "sent");
    const pipelinePhase1 = sentProposals.reduce((s, p) => s + proposalPhase1Net(p), 0);
    const pipelinePhase2 = sentProposals.reduce((s, p) => s + proposalPhase2Net(p), 0);
    return { total, sent, winRate, pipelinePhase1, pipelinePhase2 };
  }, [proposals]);

  function startNew() {
    setEditing(emptyDraft(nextProposalNumber(proposals)));
  }

  function startEdit(p: Proposal) {
    // Normalises legacy fields:
    //  - p1_items / p2_items may be empty → seed from p2_rate / p2_total / phase2_title
    //  - p1_discount_amount preferred, falls back to (p1_subtotal * p1_discount%) / 100
    //  - same for p2
    // Builds a ProposalDraft from a stored Proposal row.
    /* … see file for full transformation … */
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const p1Items = editing.p1_items.map((d) => fromLineItemDraft(d));
    const p1Subtotal = lineSubtotal(p1Items);
    const p1DiscountAmt = parseFloat(editing.p1_discount_amount || "0") || 0;
    const p1DiscountPct =
      p1Subtotal > 0 && p1DiscountAmt > 0 ? (p1DiscountAmt / p1Subtotal) * 100 : 0;
    const p2Items = editing.p2_items.map((d) => fromLineItemDraft(d));
    const p2Subtotal = lineSubtotal(p2Items);
    const p2DiscountAmt = parseFloat(editing.p2_discount_amount || "0") || 0;
    const p2DiscountPct =
      p2Subtotal > 0 && p2DiscountAmt > 0 ? (p2DiscountAmt / p2Subtotal) * 100 : 0;
    const computedPhase2Title =
      editing.phase2_title?.trim() ||
      (p2Items.length === 1 ? String(p2Items[0].title ?? "") : "") ||
      (p2Items.length > 1 ? "Monthly Retainer" : "");
    const payload = {
      number: editing.number, date: editing.date,
      valid_until: editing.valid_until || null,
      status: editing.status,
      client_name: editing.client_name,
      client_email: editing.client_email,
      client_company: editing.client_company,
      intro: editing.intro, notes: editing.notes,
      p1_items: p1Items,
      p1_discount_amount: p1DiscountAmt,
      p1_discount: p1DiscountPct,
      p1_total: p1Subtotal,
      phase1_compare: editing.phase1_compare,
      phase1_note: editing.phase1_note,
      phase1_timeline: editing.phase1_timeline,
      phase1_payment: editing.phase1_payment,
      p2_items: p2Items,
      phase2_title: computedPhase2Title,
      p2_rate: p2Subtotal, p2_total: p2Subtotal,
      p2_discount_amount: p2DiscountAmt,
      p2_discount: p2DiscountPct,
      phase2_compare: editing.phase2_compare,
      phase2_note: editing.phase2_note,
      phase2_commitment: editing.phase2_commitment,
    };
    const { error } = editing.id
      ? await supabase.from("proposals").update(payload).eq("id", editing.id)
      : await supabase.from("proposals").insert(payload);
    setSaving(false);
    if (error) { alert(`Save failed: ${error.message}`); return; }
    setEditing(null);
    await load();
  }

  async function handleDelete() {
    if (!deleting) return;
    await supabase.from("proposals").delete().eq("id", deleting.id);
    setDeleting(null);
    await load();
  }

  async function createAgreement(p: Proposal) {
    // Cross-module flow: convert an "accepted" proposal into a draft agreement.
    // Imports defaults dynamically, derives phase1_items[], copies p2_rate,
    // looks up the matching client by email/company to backfill client_address,
    // generates the next ATMSA number via nextInvoiceNumber(..., "ATMSA"),
    // inserts into "agreements", then router.push(`/agreements?edit=${id}`).
    /* … see file for the full payload assembly … */
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div><h1>Proposals</h1></div>
        <div className="flex gap-2">
          <a className="btn btn-secondary" href="/capabilities.html"
             target="_blank" rel="noopener noreferrer">
            Download Capabilities Deck
          </a>
          <button className="btn btn-primary" onClick={startNew}>+ New proposal</button>
        </div>
      </header>

      <section className="grid-5">
        <Kpi label="Total" value={String(stats.total)} hint="all proposals" />
        <Kpi label="Open" value={String(stats.sent)} hint="sent proposals" accent />
        <Kpi label="Win rate" value={`${stats.winRate}%`} hint="of closed proposals" />
        <Kpi label="Phase 1 pipeline"
             value={currency(stats.pipelinePhase1, currencyCode)}
             hint="sent proposals" />
        <Kpi label="Phase 2 pipeline"
             value={`${currency(stats.pipelinePhase2, currencyCode)}/mo`}
             hint="sent proposals" />
      </section>

      <div className="section-header">
        <div className="section-header-bar" />
        <div className="section-header-title">All proposals</div>
        <div className="section-header-line" />
      </div>

      <div className="table-wrapper">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Number</th><th>Client</th><th>Date</th><th>Valid until</th>
                <th className="td-right">Phase 1</th>
                <th className="td-right">Phase 2</th>
                <th>Status</th>
                <th className="td-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Loading / empty / row mapping with inline icon buttons:
                  Eye (preview), Pencil (edit), FileSignature (only if status==='accepted',
                  triggers createAgreement), Trash2 (delete). */}
            </tbody>
          </table>
        </div>
      </div>

      <ProposalForm open={!!editing} draft={editing} services={services}
        saving={saving} onChange={setEditing}
        onClose={() => setEditing(null)} onSubmit={handleSave} />
      <ProposalPreview open={!!previewing} proposal={previewing}
        settings={settings} onClose={() => setPreviewing(null)} />
      <ConfirmDialog open={!!deleting} title="Delete proposal?"
        message="This action cannot be undone."
        onCancel={() => setDeleting(null)} onConfirm={handleDelete} />
    </div>
  );
}

function Kpi({ label, value, hint, accent }: {
  label: string; value: string; hint?: string; accent?: boolean;
}) {
  return (
    <div className={`kpi-card${accent ? " accent" : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {hint && <div className="kpi-sub">{hint}</div>}
    </div>
  );
}
```

#### `app/(app)/proposals/proposal-form.tsx`
Defines `ProposalDraft` type. Modal with Phase 1 / Phase 2 sections, each containing a service-picker repeater (`<select>` per row, no free-form title — service drives everything), `DollarInput` for discount amount, computed subtotal/net display, and the usual client/date/intro/notes fields. Helpers `pickP1Service`/`pickP2Service` clone fields from the chosen `Service` row into the line item.

```tsx
export type ProposalDraft = {
  id?: string; number: string; date: string; valid_until: string; status: string;
  client_name: string; client_email: string; client_company: string;
  intro: string; notes: string;

  p1_items: LineItemDraft[];
  p1_discount_amount: string;
  phase1_compare: string; phase1_note: string;
  phase1_timeline: string; phase1_payment: string;

  p2_items: LineItemDraft[];
  phase2_title: string;
  p2_discount_amount: string;
  phase2_compare: string; phase2_note: string;
  phase2_commitment: string;
};
```

#### `app/(app)/proposals/proposal-preview.tsx`
HTML preview that mirrors the proposal PDF: hero header (brand + number + dates), prepared-for block, intro paragraph, two cards (Phase 1 cream, Phase 2 dark), strike-through compare prices, optional “Introductory rate for the first N months” paragraph, notes. Footer has Close + `<PDFDownloadButton type="proposal" data={proposal} />`.

### 3.2 Agreements

#### `app/(app)/agreements/page.tsx`
Status filters: `all | draft | sent | signed | active | completed | cancelled`. Tab counts derived per render. KPIs: Total / Pending signature / Active monthly value / Signed this year. Supports a deep link `?edit={id}` (used by the proposals → agreement handoff). Side effects:

- `markSigned` sets `status=signed, signed_date=today`.
- `sendEmail` builds a `mailto:` from `agreement_email_subject` / `agreement_email_body` settings with merge fields (`{client_name}`, `{client_company}`, `{agreement_number}`, `{phase1_total}`, `{phase2_rate}`), opens the user’s mail client, and if the agreement was `draft` flips it to `sent`.
- `duplicate` clones the draft, resets sign metadata, generates a new `ATMSA###` number.

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Eye, Pencil, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { currency, dateCompact, dateISO, nextInvoiceNumber } from "@/lib/format";
import { ConfirmDialog } from "@/components/modal";
import { DEFAULT_KICKOFF_ITEMS } from "@/lib/defaults/kickoff-checklist";
import { DEFAULT_LEGAL_TERMS } from "@/lib/defaults/legal-terms";
import type { Agreement, AgreementStatus, Client, SettingsMap } from "@/lib/types";
import AgreementForm, { type AgreementDraft } from "./agreement-form";
import AgreementPreview from "./agreement-preview";

const STATUS_FILTERS = [
  "all", "draft", "sent", "signed", "active", "completed", "cancelled",
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function nextAgreementNumber(existing: { number: string | null }[]) {
  return nextInvoiceNumber(existing, "ATMSA").replace(/^#/, "");
}

function agreementToDraft(a: Agreement, clients: Client[]): AgreementDraft {
  const matchedClient =
    (a.client_email &&
      clients.find(
        (c) =>
          (c.email ?? "").toLowerCase() ===
          (a.client_email ?? "").toLowerCase(),
      )) || null;
  return {
    id: a.id,
    number: a.number,
    date: a.date ?? dateISO(),
    status: a.status,
    proposal_id: a.proposal_id,
    proposal_number: a.proposal_number,
    proposal_date: a.proposal_date,
    client_id: matchedClient?.id ?? "",
    client_name: a.client_name || matchedClient?.name || "",
    client_email: a.client_email || matchedClient?.email || "",
    client_company: a.client_company || matchedClient?.company || "",
    client_address: a.client_address || matchedClient?.address || "",
    phase1_items: Array.isArray(a.phase1_items) ? a.phase1_items : [],
    phase1_total: String(a.phase1_total ?? 0),
    phase1_discount: String(a.phase1_discount ?? 0),
    phase1_timeline: a.phase1_timeline ?? "",
    phase1_payment: a.phase1_payment ?? "",
    phase2_service: a.phase2_service ?? "",
    phase2_rate: String(a.phase2_rate ?? 0),
    phase2_discount: String(a.phase2_discount ?? 0),
    phase2_commitment: String(a.phase2_commitment ?? 3),
    phase2_start_date: a.phase2_start_date ?? "",
    kickoff_items:
      Array.isArray(a.kickoff_items) && a.kickoff_items.length > 0
        ? a.kickoff_items
        : DEFAULT_KICKOFF_ITEMS,
    terms: a.terms || DEFAULT_LEGAL_TERMS,
    signed_date: a.signed_date ?? "",
    signed_by_name: a.signed_by_name ?? "",
    signed_by_title: a.signed_by_title ?? "",
    notes: a.notes ?? "",
  };
}

function emptyDraft(number: string, settings: SettingsMap): AgreementDraft {
  return {
    number, date: dateISO(), status: "draft",
    proposal_id: null, proposal_number: null, proposal_date: null,
    client_id: "", client_name: "", client_email: "",
    client_company: "", client_address: "",
    phase1_items: [{ name: "", price: 0 }],
    phase1_total: "0", phase1_discount: "",
    phase1_timeline: "20 – 45 days",
    phase1_payment:
      settings.agreement_default_phase1_payment ??
      "50% upon signing, 50% upon delivery",
    phase2_service: "", phase2_rate: "0",
    phase2_discount: "", phase2_commitment: "3",
    phase2_start_date: "",
    kickoff_items: DEFAULT_KICKOFF_ITEMS,
    terms: DEFAULT_LEGAL_TERMS,
    signed_date: "", signed_by_name: "", signed_by_title: "",
    notes: "",
  };
}

function buildPayload(d: AgreementDraft) {
  return {
    number: d.number, date: d.date, status: d.status,
    proposal_id: d.proposal_id,
    proposal_number: d.proposal_number,
    proposal_date: d.proposal_date,
    client_name: d.client_name || null,
    client_email: d.client_email || null,
    client_company: d.client_company || null,
    client_address: d.client_address || null,
    phase1_items: d.phase1_items,
    phase1_total: d.phase1_items.reduce(
      (sum, it) => sum + (Number(it.price) || 0),
      0,
    ),
    phase1_discount: Number(d.phase1_discount) || 0,
    phase1_timeline: d.phase1_timeline || null,
    phase1_payment: d.phase1_payment || null,
    phase2_service: d.phase2_service || null,
    phase2_rate: Number(d.phase2_rate) || 0,
    phase2_discount: Number(d.phase2_discount) || 0,
    phase2_commitment: Number(d.phase2_commitment) || 0,
    phase2_start_date: d.phase2_start_date || null,
    kickoff_items: d.kickoff_items,
    terms: d.terms || null,
    signed_date: d.signed_date || null,
    signed_by_name: d.signed_by_name || null,
    signed_by_title: d.signed_by_title || null,
    notes: d.notes || null,
  };
}

// AgreementsPage: load agreements + clients + settings, derive filter counts,
// KPIs, and open the form / preview / confirm dialog. Also implements
// markSigned, sendEmail (with merge fields and auto-flip draft→sent), and
// duplicate (resets sign metadata + new number).
```

#### `app/(app)/agreements/agreement-form.tsx`
Defines `AgreementDraft`. Modal sections:
1. Number / Date / Status
2. Client (`<select>` from existing clients populates name/email/company/address)
3. Phase 1 — repeating `{ name, price }` rows, discount input, computed Phase 1 total
4. Phase 1 timeline + payment schedule
5. Phase 2 — service name, monthly rate, monthly discount, commitment months, start date
6. Kickoff Requirements — grouped by `KICKOFF_CATEGORIES`, each row has “Req” / “Ok” checkboxes plus item + notes inputs, with “+ Add item” per category and “Reset to default list”
7. Terms textarea (mono) with merge-field hint + reset button
8. Signed date / Signed by name / Signed by title
9. Internal notes

```tsx
export type AgreementDraft = {
  id?: string; number: string; date: string; status: AgreementStatus;
  proposal_id: string | null; proposal_number: string | null; proposal_date: string | null;
  client_id: string; client_name: string; client_email: string;
  client_company: string; client_address: string;
  phase1_items: Phase1Item[];
  phase1_total: string; phase1_discount: string;
  phase1_timeline: string; phase1_payment: string;
  phase2_service: string;
  phase2_rate: string; phase2_discount: string;
  phase2_commitment: string; phase2_start_date: string;
  kickoff_items: KickoffItem[];
  terms: string;
  signed_date: string; signed_by_name: string; signed_by_title: string;
  notes: string;
};
```

#### `app/(app)/agreements/agreement-preview.tsx`
HTML preview rendered as a `card-muted` block. Header shows `agreement_legal_entity` and an Effective date. `Section` helper for grouped blocks. `renderTerms()` substitutes `{client_company}`, `{phase2_commitment}`, `{governing_law}`, `{legal_entity}` (and the proposal_ref if present). Footer: Close, `<PDFDownloadButton type="agreement" />`, Send via email, Mark signed (hidden once `signed | active | completed`).

### 3.3 Clients

`app/(app)/clients/page.tsx`. Self-contained module — defines its own local `Client` and `Draft` types (instead of using `lib/types.ts`). Single page: `<table>` of clients + inline `ClientModal` defined at the bottom of the same file. The modal has a custom multi-email chip input that adds entries on Enter / comma and removes the last on Backspace.

```tsx
type Client = {
  id: string; name: string | null; email: string | null;
  emails: string[] | null; company: string | null; address: string | null;
  payment_terms: string | null; status: string | null;
  monthly_value: number | null; growth_stage: string | null;
  notes: string | null; created_at: string | null;
};

type Draft = {
  id?: string; name: string; company: string; address: string;
  email: string; emails: string[];
  payment_terms: string; status: string; monthly_value: string;
  growth_stage: string; notes: string;
};

const EMPTY_DRAFT: Draft = {
  name: "", company: "", address: "",
  email: "", emails: [],
  payment_terms: "Net 15", status: "active", monthly_value: "0",
  growth_stage: "", notes: "",
};
```

There is **no detail page** for clients — view/edit happens in the modal only.

---

## 4. Shared UI components

`components/` only contains two files:

| File | One-line description |
|---|---|
| `components/modal.tsx` | Two exports: `Modal` (overlay + Esc-to-close) and `ConfirmDialog` (a `Modal` preset with confirm/cancel buttons). |
| `components/pdf-download-button.tsx` | Discriminated-union button that dynamically imports the correct `lib/pdf/*-pdf.ts` generator based on `type: "invoice" | "proposal" | "agreement"`. Shows "Generating…" while busy. |

No `components/ui/` folder exists. Buttons, cards, badges, tables, tabs, and form controls all come from utility classes defined in `app/globals.css` (see §7), not from individual React components. Each module page re-defines its own little `Kpi` helper inline.

### `components/modal.tsx`

```tsx
"use client";

import { useEffect } from "react";

export function Modal({
  open, onClose, title, children, footer, maxWidth = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth }}
           onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button type="button" className="modal-close"
                  onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, title = "Delete?", message,
  confirmLabel = "Delete", cancelLabel = "Cancel",
  danger = true, onConfirm, onCancel,
}: {
  open: boolean; title?: string; message: string;
  confirmLabel?: string; cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal
      open={open} onClose={onCancel} title={title} maxWidth={420}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button"
                  className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
                  onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ color: "var(--muted)" }}>{message}</p>
    </Modal>
  );
}
```

### `components/pdf-download-button.tsx`

```tsx
"use client";

import { useState } from "react";

type Settings = Record<string, string | undefined>;

type ServiceRef = {
  id?: string;
  name?: string | null;
  description?: string | null;
  desc?: string | null;
};

type InvoiceProps = {
  type: "invoice";
  data: Parameters<typeof import("@/lib/pdf/invoice-pdf").generateInvoicePDF>[0];
  settings: Settings;
  services?: ServiceRef[];
  label?: string;
  className?: string;
};

type ProposalProps = {
  type: "proposal";
  data: Parameters<typeof import("@/lib/pdf/proposal-pdf").generateProposalPDF>[0];
  settings: Settings;
  label?: string; className?: string;
};

type AgreementProps = {
  type: "agreement";
  data: Parameters<typeof import("@/lib/pdf/agreement-pdf").generateAgreementPDF>[0];
  settings: Settings;
  label?: string; className?: string;
};

export default function PDFDownloadButton(
  props: InvoiceProps | ProposalProps | AgreementProps,
) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      if (props.type === "invoice") {
        const { generateInvoicePDF } = await import("@/lib/pdf/invoice-pdf");
        generateInvoicePDF(props.data, props.settings, props.services ?? []);
      } else if (props.type === "proposal") {
        const { generateProposalPDF } = await import("@/lib/pdf/proposal-pdf");
        generateProposalPDF(props.data, props.settings);
      } else {
        const { generateAgreementPDF } = await import("@/lib/pdf/agreement-pdf");
        generateAgreementPDF(props.data, props.settings);
      }
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button"
            className={props.className ?? "btn btn-secondary"}
            onClick={handleClick}
            disabled={busy}>
      {busy ? "Generating…" : (props.label ?? "Download PDF")}
    </button>
  );
}
```

---

## 5. Supabase schema

There are two SQL files — a base `supabase/schema.sql` plus two later migrations under `supabase/migrations/`. There is no generated TypeScript types file (e.g. `lib/database.types.ts` or `types/supabase.ts`). All row shapes are hand-typed in `lib/types.ts` and inside individual page files.

### `supabase/schema.sql` (baseline)

```sql
-- Attomik HQ schema

create table invoices (
  id uuid primary key default gen_random_uuid(),
  number text,
  date date,
  due date,
  status text default 'draft',
  client_name text,
  client_email text,
  client_company text,
  client_address text,
  items jsonb default '[]',
  discount numeric default 0,
  notes text,
  created_at timestamptz default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  emails jsonb default '[]',
  company text,
  address text,
  payment_terms text,
  status text default 'active',
  monthly_value numeric default 0,
  growth_stage text,
  notes text,
  created_at timestamptz default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  price numeric default 0,
  created_at timestamptz default now()
);

create table proposals (
  id uuid primary key default gen_random_uuid(),
  number text,
  date date,
  valid_until date,
  status text default 'draft',
  client_name text,
  client_email text,
  client_company text,
  intro text,
  items jsonb default '[]',
  discount numeric default 0,
  notes text,
  phase1_title text,
  phase1_price text,
  phase1_compare text,
  phase1_note text,
  phase1_timeline text,
  phase1_payment text,
  phase2_title text,
  phase2_monthly text,
  phase2_compare text,
  phase2_note text,
  phase2_commitment text,
  created_at timestamptz default now()
);

create table settings (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  value text
);

create table pipeline_contacts (
  id uuid primary key default gen_random_uuid(),
  name text,
  company text,
  email text,
  status text default 'idea',
  stage text,
  notes text,
  monthly_value numeric default 0,
  last_contact date,
  created_at timestamptz default now()
);
```

### `supabase/migrations/create_agreements_table.sql`

```sql
-- Services Agreement module

create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  date date not null default current_date,
  status text not null default 'draft'
    check (status in ('draft','sent','signed','active','completed','cancelled')),
  proposal_id uuid references public.proposals(id) on delete set null,
  client_name text,
  client_email text,
  client_company text,
  client_address text,
  phase1_items jsonb default '[]'::jsonb,
  phase1_total numeric(12,2) default 0,
  phase1_timeline text,
  phase1_payment text,
  phase2_service text,
  phase2_rate numeric(12,2) default 0,
  phase2_commitment integer default 6,
  phase2_start_date date,
  kickoff_items jsonb default '[]'::jsonb,
  terms text,
  signed_date date,
  signed_by_name text,
  signed_by_title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agreements_status_idx on public.agreements(status);
create index if not exists agreements_date_idx on public.agreements(date desc);
create index if not exists agreements_proposal_id_idx on public.agreements(proposal_id);
create index if not exists agreements_client_email_idx on public.agreements(client_email);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists agreements_set_updated_at on public.agreements;
create trigger agreements_set_updated_at
  before update on public.agreements
  for each row execute function public.set_updated_at();

alter table public.agreements enable row level security;

drop policy if exists "agreements_all_authenticated" on public.agreements;
create policy "agreements_all_authenticated" on public.agreements
  for all to authenticated using (true) with check (true);

insert into public.settings (key, value) values
  ('agreement_default_phase1_payment', '50% upon signing, 50% upon delivery'),
  ('agreement_default_phase2_payment', 'Invoiced monthly on the 1st, due net 15'),
  ('agreement_default_late_fee', '1.5% per month on overdue balances'),
  ('agreement_governing_law', 'State of Delaware, United States'),
  ('agreement_legal_entity', 'Attomik, LLC'),
  ('agreement_email_subject', 'Welcome to Attomik — Services Agreement for {client_company}'),
  ('agreement_email_body', E'Hi {client_name},\n\nExcited to make this official. ...')
on conflict (key) do nothing;
```

### `supabase/migrations/add_discount_to_agreements.sql`

```sql
-- Persist proposal discounts on derived agreements so they remain visible.

alter table public.agreements
  add column if not exists phase1_discount numeric(12,2) not null default 0,
  add column if not exists phase2_discount numeric(12,2) not null default 0;
```

### Hand-typed row shapes (`lib/types.ts`)

```ts
import type { LineItem } from "@/lib/format";

export type Client = {
  id: string;
  name: string | null;
  email: string | null;
  emails: string[] | null;
  company: string | null;
  address: string | null;
  payment_terms: string | null;
  status: string | null;
  monthly_value: number | null;
  growth_stage: string | null;
  notes: string | null;
};

export type Service = {
  id: string;
  name: string | null;
  description: string | null;
  desc?: string | null;            // legacy alias accepted
  price: number | null;
};

export type Invoice = {
  id: string;
  number: string | null;
  date: string | null;
  due: string | null;
  status: string | null;
  client_name: string | null;
  client_email: string | null;
  client_company: string | null;
  client_address: string | null;
  items: LineItem[] | null;
  discount: number | null;
  notes: string | null;
  created_at: string | null;
};

export type Proposal = {
  id: string;
  number: string | null;
  date: string | null;
  valid_until: string | null;
  status: string | null;
  client_name: string | null;
  client_email: string | null;
  client_company: string | null;
  intro: string | null;
  items: LineItem[] | null;          // legacy
  discount: number | null;           // legacy
  notes: string | null;
  // Phase 1 — current
  p1_items: LineItem[] | null;
  p1_discount: number | null;
  p1_discount_amount: number | null;
  phase1_compare: string | null;
  phase1_note: string | null;
  phase1_timeline: string | null;
  phase1_payment: string | null;
  // Phase 2 — current
  phase2_title: string | null;
  p2_items: LineItem[] | null;
  p2_rate: number | null;
  p2_discount: number | null;
  p2_discount_amount: number | null;
  phase2_compare: string | null;
  phase2_note: string | null;
  phase2_commitment: string | null;
  // Legacy single-price fields
  phase1_title: string | null;
  phase1_price: string | null;
  phase2_monthly: string | null;
  // Legacy boolean add-ons (predate p1_items)
  p1_type: string | null;
  p1_second_store: boolean | null;
  p1_amazon: boolean | null;
  p1_tiktok: boolean | null;
  p1_email_template: boolean | null;
  p1_total: number | null;
  p2_bundle: string | null;
  p2_total: number | null;
  p2_second_store: boolean | null;
  created_at: string | null;
};

export type SettingsMap = Partial<{
  brand_name: string; legal_name: string; address: string; email: string; phone: string;
  currency: string; default_payment_terms: string; payment_instructions: string;
  agreement_default_phase1_payment: string;
  agreement_default_phase2_payment: string;
  agreement_default_late_fee: string;
  agreement_governing_law: string;
  agreement_legal_entity: string;
  agreement_email_subject: string;
  agreement_email_body: string;
}>;

export type AgreementStatus =
  | "draft" | "sent" | "signed" | "active" | "completed" | "cancelled";

export type KickoffItem = {
  category: string; item: string;
  required: boolean; provided: boolean;
  notes?: string;
};

export type Phase1Item = {
  name: string; price: number; description?: string;
};

export type Agreement = {
  id: string;
  number: string;
  date: string;
  status: AgreementStatus;
  proposal_id: string | null;
  proposal_number: string | null;          // ⚠ not in create_agreements_table.sql
  proposal_date: string | null;            // ⚠ not in create_agreements_table.sql
  client_name: string | null;
  client_email: string | null;
  client_company: string | null;
  client_address: string | null;
  phase1_items: Phase1Item[];
  phase1_total: number;
  phase1_discount: number;
  phase1_timeline: string | null;
  phase1_payment: string | null;
  phase2_service: string | null;
  phase2_rate: number;
  phase2_discount: number;
  phase2_commitment: number;
  phase2_start_date: string | null;
  kickoff_items: KickoffItem[];
  terms: string | null;
  signed_date: string | null;
  signed_by_name: string | null;
  signed_by_title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// Cross-module form helper for line items
export type LineItemDraft = {
  service_id: string;
  title: string;
  description: string;
  qty: string;
  rate: string;
};

export const EMPTY_LINE: LineItemDraft = {
  service_id: "", title: "", description: "", qty: "1", rate: "0",
};

export function toLineItemDraft(li: LineItem | null | undefined): LineItemDraft {
  return {
    service_id: (li?.service_id as string) ?? "",
    title: ((li?.title ?? li?.name) as string) ?? "",
    description: ((li?.description ?? li?.desc) as string) ?? "",
    qty: String(li?.qty ?? li?.quantity ?? 1),
    rate: String(li?.rate ?? li?.price ?? 0),
  };
}

export function fromLineItemDraft(d: LineItemDraft): LineItem {
  return {
    service_id: d.service_id || null,
    title: d.title, description: d.description,
    qty: Number(d.qty) || 0, rate: Number(d.rate) || 0,
  };
}
```

### Ad-hoc tables / fields referenced in code but not in migrations

- `pipeline_contacts.stage` and `pipeline_contacts.last_contact` — present in `schema.sql`, used by `pipeline/page.tsx`. ✅
- `agreements.proposal_number`, `agreements.proposal_date` — referenced in `proposals/page.tsx createAgreement()`, `agreements/page.tsx buildPayload()` and `agreementToDraft()`, plus `lib/pdf/agreement-pdf.ts`, but **not declared in any migration**. There must be a third migration applied directly in Supabase, or these inserts are silently dropped. Worth confirming.
- `clients.address` — in `schema.sql`. ✅
- `clients.payment_terms` — in `schema.sql`. ✅
- `settings` rows are upserted by `key`. Several keys (e.g. `target_mrr`) are written from `pipeline/page.tsx` but never declared in the settings migration — they’re just key/value rows.

---

## 6. Shared libraries and utilities

### `lib/format.ts`
```ts
export function currency(n: number, code = "USD") {
  return (Number(n) || 0).toLocaleString("en-US", {
    style: "currency", currency: code,
  });
}

/** Currency without trailing `.00` on whole numbers. */
export function currencyCompact(n: number, code = "USD") {
  const v = Number(n) || 0;
  const whole = Number.isInteger(v);
  return v.toLocaleString("en-US", {
    style: "currency", currency: code,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

// "YYYY-MM-DD" parsed as local-tz so date-only DB values don't render
// a day earlier in Americas timezones.
function parseDateValue(d: string | Date): Date {
  if (typeof d !== "string") return d;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(d);
}

export function dateCompact(d: string | Date | null | undefined) { /* "May 24" */ }
export function dateShort  (d: string | Date | null | undefined) { /* "May 24, 2026" */ }
export function dateISO    (d: Date = new Date()) { /* "YYYY-MM-DD" */ }
export function addDays    (d: Date, days: number) { /* … */ }

export type LineItem = {
  service_id?: string | null;
  title?: string | null;        name?: string | null;
  description?: string | null;  desc?: string | null;
  qty?: number | string | null; quantity?: number | string | null;
  rate?: number | string | null; price?: number | string | null;
};

export function lineSubtotal(items: LineItem[] | null | undefined) {
  const list = Array.isArray(items) ? items : [];
  return list.reduce((sum, it) => {
    const qty = Number(it.qty ?? it.quantity ?? 1) || 0;
    const rate = Number(it.rate ?? it.price ?? 0) || 0;
    return sum + qty * rate;
  }, 0);
}

export function invoiceTotal(items, discountPercent) { /* subtotal * (1 - pct/100) */ }

// Proposal helpers handle the legacy fallback chain:
// p1_items[]  →  p1_total  →  parseMoney(phase1_price)
// p2_items[]  →  p2_rate   →  p2_total
// Discount: prefer absolute *_discount_amount, fall back to *_discount %
export function proposalPhase1Net(p): number { /* … */ }
export function proposalPhase2Net(p): number { /* … */ }
export function proposalTotal(p): number { return phase1 + phase2; }

// Auto-numbering — returns "#PREFIX###" (zero-padded to 3).
// Matches both "ATM001" and "#ATM001" (covers Sheets imports).
export function nextInvoiceNumber(
  existing: { number: string | null }[],
  prefix = "ATM",
): string { /* … */ }
```

### `lib/types.ts`
See full contents under §5.

### `lib/supabase/client.ts`
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

### `lib/supabase/server.ts`
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component — middleware will refresh the session
          }
        },
      },
    },
  );
}
```

### `lib/supabase/middleware.ts`
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone(); url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone(); url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return response;
}
```

### `lib/defaults/legal-terms.ts`
Exports `DEFAULT_LEGAL_TERMS` (an 11-clause Services Agreement template — Scope, Standard of Care, Fees & Payment, Term & Termination, IP, Confidentiality, Limitation of Liability, Independent Contractor, Client Responsibilities & Dependencies, Governing Law, Entire Agreement) and a `renderTerms(template, vars)` helper that substitutes `{client_company}`, `{phase2_commitment}`, `{phase2_commitment_next}`, `{governing_law}`, `{legal_entity}`, and `{proposal_ref}` (built from `proposal_number` + `proposal_date`).

```ts
export const DEFAULT_LEGAL_TERMS = `1. SCOPE OF SERVICES

{legal_entity} ("Attomik") agrees to provide the services described in
{proposal_ref}, which is attached to and incorporated by reference into this
Agreement (the "Proposal"), to {client_company} ("Client"). ... `;

export function renderTerms(
  template: string,
  vars: {
    client_company?: string | null;
    phase2_commitment?: number | null;
    governing_law?: string | null;
    legal_entity?: string | null;
    proposal_number?: string | null;
    proposal_date?: string | null;
  },
): string {
  const commitment = Number(vars.phase2_commitment) || 3;
  const proposalNumber = (vars.proposal_number ?? "").trim();
  const proposalDate = (vars.proposal_date ?? "").trim();
  const proposalRef = proposalNumber
    ? proposalDate
      ? `Proposal ${proposalNumber} dated ${proposalDate}`
      : `Proposal ${proposalNumber}`
    : "the attached proposal";
  return template
    .replace(/\{client_company\}/g, vars.client_company || "Client")
    .replace(/\{phase2_commitment\}/g, String(commitment))
    .replace(/\{phase2_commitment_next\}/g, String(commitment + 1))
    .replace(/\{governing_law\}/g, vars.governing_law || "State of Delaware, United States")
    .replace(/\{legal_entity\}/g, vars.legal_entity || "Attomik, LLC")
    .replace(/\{proposal_ref\}/g, proposalRef);
}
```

### `lib/defaults/kickoff-checklist.ts`
Exports `DEFAULT_KICKOFF_ITEMS: KickoffItem[]` (~23 items grouped into 5 categories) and the `KICKOFF_CATEGORIES` tuple used to drive the UI groupings.

```ts
export const DEFAULT_KICKOFF_ITEMS: KickoffItem[] = [
  { category: "Brand Assets",         item: "Logo files (SVG, PNG — dark & light variants)", required: true,  provided: false },
  { category: "Brand Assets",         item: "Brand guidelines or style guide",                 required: true,  provided: false },
  { category: "Brand Assets",         item: "Typography files or font specifications",         required: false, provided: false },
  { category: "Brand Assets",         item: "Product photography (high-res)",                  required: true,  provided: false },
  { category: "Brand Assets",         item: "Lifestyle imagery (high-res)",                    required: false, provided: false },
  { category: "Brand Assets",         item: "Brand voice and messaging document",              required: false, provided: false },
  { category: "Platform Access",      item: "Shopify admin access (Staff or Collaborator)",    required: true,  provided: false },
  { category: "Platform Access",      item: "Domain registrar access (for DNS)",               required: false, provided: false },
  { category: "Platform Access",      item: "Current theme files (if custom)",                 required: false, provided: false },
  { category: "Marketing Access",     item: "Meta Business Manager (admin access)",            required: true,  provided: false },
  { category: "Marketing Access",     item: "Google Analytics 4 (admin access)",               required: true,  provided: false },
  { category: "Marketing Access",     item: "Google Ads (if applicable)",                      required: false, provided: false },
  { category: "Marketing Access",     item: "Klaviyo or current ESP (admin access)",           required: true,  provided: false },
  { category: "Marketing Access",     item: "TikTok for Business (if applicable)",             required: false, provided: false },
  { category: "Marketing Access",     item: "Amazon Seller Central (if applicable)",           required: false, provided: false },
  { category: "Product & Commercial", item: "Full product catalog / SKU list with pricing",    required: true,  provided: false },
  { category: "Product & Commercial", item: "Cost of goods per SKU",                           required: false, provided: false },
  { category: "Product & Commercial", item: "Revenue, AOV, and conversion data (last 90 days)",required: true,  provided: false },
  { category: "Product & Commercial", item: "Inventory system access or current export",       required: false, provided: false },
  { category: "People & Process",     item: "Primary point of contact (name, email, phone)",   required: true,  provided: false },
  { category: "People & Process",     item: "Decision maker (if different from primary contact)", required: false, provided: false },
  { category: "People & Process",     item: "Preferred communication channel (Slack / email / Notion)", required: true, provided: false },
  { category: "People & Process",     item: "Kickoff call scheduled",                          required: true,  provided: false },
];

export const KICKOFF_CATEGORIES = [
  "Brand Assets", "Platform Access", "Marketing Access",
  "Product & Commercial", "People & Process",
] as const;

export type KickoffCategory = (typeof KICKOFF_CATEGORIES)[number];
```

### `lib/pdf/`

| File | Purpose |
|---|---|
| `lib/pdf/logos.ts` | Two base64 PNG data URIs: `LOGO_BLACK_B64` and `LOGO_WHITE_B64`, used by every PDF generator. ~16KB each. |
| `lib/pdf/invoice-pdf.ts` | `generateInvoicePDF(inv, settings, services)` — single-page Letter PDF: logo top-left, accent-green number badge top-right, FROM/BILL TO columns, `SERVICE | QTY | RATE | TOTAL` table, totals block (subtotal / discount % / TOTAL DUE), then optional Payment Instructions / Payment Terms (with `{due_date}` substitution) / Notes sections. Filename: `${num} - ${client} ${MM}-${YY}.pdf`. |
| `lib/pdf/proposal-pdf.ts` | `generateProposalPDF(prop, settings)` — multi-page sales deck: dark cover with grid pattern + green title accent, **Our Approach** page (3 black tiles + portfolio bar + green callout from `prop.intro`), **Phase One** page (5 fixed bullets-tiles based on hard-coded `FIXED_P1_TILES` plus an optional "Services Included" tile, pricing card with strike-through compare/discount + rate-note + timeline + payment, then included/not-included scope boxes), **Phase Two** page (4 fixed deliverables, monthly card with strike-through, intro-rate paragraph, scope boxes), and a **Partnership** closing page (Phase 1 cream column + Ongoing dark column + closing paragraph). Filename: `Attomik_Proposal_${client}_${YYYY}.pdf`. |
| `lib/pdf/agreement-pdf.ts` | `generateAgreementPDF(agreement, settings)` — minimal-chrome legal doc: logo + "SERVICES AGREEMENT" + Effective date header, two-column BETWEEN / AND parties block (Attomik fixed at 169 Madison Ave, STE 2733, NY 10016 + client address from agreement.client_address), "TERMS & CONDITIONS" rendered from `renderTerms()` paragraph-by-paragraph (numbered headings auto-detected with `/^\d+\.\s+[A-Z]/`), then two stacked signer blocks ("FOR ATTOMIK, LLC" pre-filled with "Pablo Rivera, Founder" + agreement date; "FOR <CLIENT>" filled from `signed_by_name/title/date`). Page chrome on every page. Filename: `Attomik_Agreement_${client}_${YYYY}.pdf`. |

(The PDF files are 250–1050 lines each — full source available at the listed paths.)

---

## 7. Styling and design tokens

### `tailwind.config.ts`
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#ffffff",
        sidebar: "#000000",
        accent: "#00ff97",
      },
      fontFamily: {
        heading: ["Barlow", "system-ui", "sans-serif"],
        sans:    ["Barlow", "system-ui", "sans-serif"],
        mono:    ["DM Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

### `postcss.config.js`
```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

### `app/globals.css`
This is the actual design system — Tailwind is barely used. The file is ~820 lines, organised as:

1. **`:root` token bank** — every color, font, font-size, font-weight, letter-spacing, spacing (`--sp-1`..`--sp-20`), radius, shadow, transition, and z-index is a CSS variable. Highlights:
   - Logo size tokens (`--logo-sidebar-h: 38px`, `--logo-topbar-h: 26px`, `--logo-mark-{sm,md,lg}`).
   - Core colors: `--ink #000`, `--paper #fff`, `--cream #f2f2f2`, `--accent #00ff97`, plus `--accent-hover #00e085`, `--accent-dark #00cc78`, `--accent-light #e6fff5`, multi-step alpha ramps (`--accent-a6` through `--accent-a40`, plus `--white-a*` and `--black-a*` ramps).
   - Semantic colors: `--success #00cc78`, `--danger #b91c1c`, `--warning #856404`, `--info #1d4ed8`, plus `--brand-green #00a86b`, `--brand-green-dark #007a48`.
   - Neutral scale (`--gray-100` through `--gray-800`), `--border #e0e0e0`, `--border-strong #c4c4c4`.
   - Dark surfaces: `--sidebar-bg #000`, `--dark-bg #111`, `--dark-card #1a1a1a`, `--dark-card-alt #2a2a2a`, `--preview-cream #f8f7f4`.
   - Layout tokens: `--sidebar-w 260px`, `--topbar-h 64px`, `--max-content-w 1200px`.
   - Two parallel font-size scales — a `rem` ladder used by component classes (`--text-xs` … `--text-4xl`) **and** a `px` ladder (`--fs-9` … `--fs-96`) ported from a TS design-tokens file. Both are in active use.
   - Letter-spacing scale (`--ls-tight` `-0.03em` … `--ls-xwide` `0.14em`), spacing scale (`--sp-1` `4px` → `--sp-20` `80px`), radius scale (`--r-xs` … `--r-pill`).
   - Shadow library (`--shadow-xs` … `--shadow-xl`, plus `--shadow-card`, `--shadow-modal`, `--shadow-dropdown`, `--shadow-accent`, etc.).
   - Transitions: `--t-fast 0.10s` through `--t-overlay 0.40s`.
   - Z-index ladder: `--z-thumb 1`, `--z-topbar 50`, `--z-sidebar 100`, `--z-modal 200`, `--z-toast 300`.

2. **Resets** — box-sizing, default font, scrollbar styling (`5px`), focus-visible outline in accent color.

3. **Logo helpers** — `.logo-sidebar`, `.logo-topbar`, `.logo-mark-{sm,md,lg}`.

4. **Typography** — h1–h6 (Barlow 800, tight tracking), `.label` (uppercase eyebrow), `.caption`, `.mono`.

5. **Layout primitives** — `.app-layout`, `.sidebar`, `.sidebar-logo`, `.sidebar-nav`, `.nav-item` (+ `.active` accent border-left), `.sidebar-footer`, `.topbar`, `.main` (margin-left: sidebar-w), `.page-content`, `.page-header`, `.section-header` + `.section-header-bar` + `.section-header-title` + `.section-header-line`, `.grid-2/3/4/5`.

6. **Buttons** — `.btn` base, then `.btn-primary` (accent green on ink), `.btn-secondary` (cream), `.btn-dark` (ink with accent text), `.btn-ghost`, `.btn-danger`, `.btn-outline`. Sizes: `.btn-xs/sm/lg/xl`, `.btn-icon`.

7. **Cards** — `.card`, `.card-sm/lg`, `.card-dark`, `.card-accent`, `.card-muted`, `.card-interactive` (hover lift). KPI cards: `.kpi-card` + `.kpi-card.accent` (ink bg, accent value), `.kpi-label`, `.kpi-value`, `.kpi-sub`.

8. **Badges** — `.badge` base + colour modifiers (`.badge-green/red/yellow/blue/black/gray`) and a long list of status-keyed variants (`status-draft`, `status-sent`, `status-paid`, `status-overdue`, `status-accepted`, `status-declined`, `status-warm`, `status-contacted`, `status-idea`, `status-no_reply`, `status-active`, `status-paused`, `status-in_review`, `status-approved`, `status-scheduled`, `status-archived`, `status-offboarded`). Also brand badges: `.badge-shopify/amazon/walmart/meta/google/tiktok`. Trend pills: `.pill-up/down`.

9. **Forms** — `.form-group`, `.form-label` (uppercase, muted), `.form-hint`, `.form-error`. Inputs/selects/textareas all share the same styling (border, accent focus ring `0 0 0 3px rgba(0,255,151,0.15)`). `.input-group` for prefix icons, `.search-input` for cream search bars.

10. **Tables** — `.table-wrapper`, `.table-scroll`, `.table-compact` (smaller padding/font), `.table-sticky` (sticky thead), `.table-pin-first` (pin first column on horizontal scroll). Cell helpers: `.td-mono`, `.td-muted`, `.td-strong`, `.td-right`. Row icon buttons: `.icon-btn` + `.icon-btn.danger`.

11. **Tabs** — `.tabs`, `.tab-btn` + `.active` (accent underline) + `.tab-count` (pill counter). Toggle group: `.toggle-group`, `.toggle-btn`.

12. **Modals** — `.modal-overlay` (45% black + 3px blur), `.modal`, `.modal-header`, `.modal-title`, `.modal-close`, `.modal-footer`. Animations: `fadeOverlay`, `slideModal`.

13. **Alerts & toasts** — `.alert` + variants, `.toast` (fixed bottom-right, ink card with accent border), `.toast-success/error`.

14. **Loading** — `.skeleton` (shimmer keyframes), `.spinner` + `.spinner-{accent,sm,lg}`, `.pulse-dot`.

15. **Avatars** — `.avatar` + `.avatar-{sm,md,lg}` + `.avatar-{dark,gray}`.

16. **Utilities** — `.divider`, flex helpers (`.flex`, `.flex-col`, `.items-center`, `.justify-between`, `.gap-{2,3,4}`, `.flex-1`, `.shrink-0`, `.truncate`, `.w-full`), font weights, color helpers, `.animate-fade`.

17. **Sticky headers** — `.topbar` always sticky (with `.topbar-scrolled` shadow added by JS), optional `.page-header-sticky` and `.section-header-sticky`. Sticky-table helpers `.table-sticky thead th` and `.table-pin-first`.

18. **Mobile** — full responsive layer with breakpoints at 1024px, 768px, 480px. Sidebar becomes a drawer (toggle `body.sidebar-open` class), `.mobile-menu-btn` hamburger, `.sidebar-overlay`. Touch-target overrides via `@media (hover: none) and (pointer: coarse)`. Grids collapse, modals go full-width, table padding shrinks, tabs scroll horizontally.

19. **Print** — hides sidebar/topbar/buttons, removes shadows.

The header `app/globals.css` describes itself as the consolidated `theme.css + components.css` from a pre-existing Attomik design system project; many values include hand-rolled component classes that **don’t** correspond to Tailwind utilities.

---

## 8. `package.json`

```json
{
  "name": "attomik-hq",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev":   "next dev",
    "build": "next build",
    "start": "next start",
    "lint":  "next lint"
  },
  "dependencies": {
    "@supabase/ssr": "^0.10.2",
    "@supabase/supabase-js": "^2.103.3",
    "jspdf": "^4.2.1",
    "lucide-react": "^1.8.0",
    "next": "14.2.18",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.20",
    "dotenv": "^17.4.2",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "ts-node": "^10.9.2",
    "typescript": "^5"
  }
}
```

`tsconfig.json` excludes `backup` and `scripts/`. The path alias is `@/*` → `./*`.

There is also a `scripts/` directory with one-off TS data-load helpers (run via `ts-node`, not part of the build):
- `scripts/list-services.ts`
- `scripts/backfill-invoice-numbers.ts`
- `scripts/migrate-proposals.ts`
- `scripts/migrate-bank-invoices.ts`
- `scripts/migrate-from-sheets.ts`

---

## 9. Inconsistencies and observations

### Naming inconsistencies

- **`p*` vs `phase*` prefixes on Proposal columns.** The `proposals` table mixes both: `p1_items / p1_discount / p1_discount_amount / p1_total` alongside `phase1_compare / phase1_note / phase1_timeline / phase1_payment / phase1_title / phase1_price`. Same on Phase 2. The `agreements` table uses only `phase1_*` / `phase2_*`. Pick one and migrate.
- **Discount representation differs across modules.** Invoices store `discount` as a percent number (0–100). Agreements store `phase1_discount` / `phase2_discount` as absolute currency amounts. Proposals store **both**: `p1_discount` (legacy %), `p1_discount_amount` (current absolute), and the save handler computes one from the other. Forms reflect this — `proposal-form.tsx` uses `DollarInput`, `agreement-form.tsx` uses a plain number input, `invoice-form.tsx` uses a 0–100 number input.
- **Rate-vs-monthly fields on Proposal.** Phase 2 has both `p2_rate`, `p2_total`, `p2_items[]`, plus the legacy `phase2_monthly` string. `proposalPhase2Net()` walks all four. The save handler always writes the same value to both `p2_rate` and `p2_total`.
- **Line-item shape is duck-typed.** `LineItem` in `lib/format.ts` accepts every legacy alias: `title|name`, `description|desc`, `qty|quantity`, `rate|price`, plus `service_id`. Every consumer (forms, previews, PDFs, dashboard service totals) re-implements the `?? quantity ?? price ?? 1 ?? 0` fallback chain. Worth normalising the data once and shrinking the type.
- **Two parallel font-size scales in CSS.** `--text-xs` … `--text-4xl` (rem) and `--fs-9` … `--fs-96` (px) coexist; both are referenced from inline styles across components. Pick one.
- **Local `Client` vs shared `Client`.** `app/(app)/clients/page.tsx` defines its own `Client` and `Draft` types instead of importing from `lib/types.ts`. They’re structurally identical to `lib/types.Client` for the columns they share — drift is likely.
- **Local `Service`, `Contact`, etc.** Same story in `services/page.tsx`, `pipeline/page.tsx`, `dashboard/page.tsx`. Each page redeclares the row shape it expects.
- **Auto-numbering names.** `nextInvoiceNumber()` is reused for invoices (`#ATM###`), proposals (`#PROP###`), and agreements (`ATMSA###` — the leading `#` is then stripped on the agreement side). The function name is misleading.
- **Status enums are stringly typed.** Only `agreements.status` has a CHECK constraint. Proposals, invoices, clients, and pipeline_contacts all accept arbitrary strings. The UI matches against literal values (`"sent"`, `"draft"`, `"warm"`, `"no_reply"`, etc.) — a typo is silent.

### Duplicated logic

- **Inline `Kpi` component in 3 places.** `proposals/page.tsx`, `agreements/page.tsx`, `dashboard/page.tsx`, and `pipeline/page.tsx` all define their own `function Kpi({ label, value, hint, accent })`. Same JSX. Easy extraction.
- **`Section` / `Cell` / `Subheader` / `EmptyRow` / `SectionHeader` / `RankedBarList` / `AgingRow`.** Several are local-only helpers, but the pattern (eyebrow + title + content) repeats — could become one `<Card eyebrow title>` primitive.
- **Client-pickers.** `agreement-form.tsx` and `invoice-form.tsx` both have a `pickClient(id)` helper that copies name/email/company/address from the matching client. Same shape, different file. Proposals doesn’t have this — proposals are opened from `pipeline/page.tsx`’s `convertToProposal()` (which writes `client_name/email/company` but doesn’t link to a client row at all).
- **Service-pickers.** `proposal-form.tsx` and `invoice-form.tsx` both have `pickService(i, id)` that copies title/description/price from the chosen service row. Two implementations.
- **Net-amount math.** `proposalPhase1Net` / `proposalPhase2Net` in `lib/format.ts` mirror the same math reimplemented inline in `proposal-preview.tsx` and `proposal-pdf.ts`. Discount/strike logic is reimplemented again in `agreement-form.tsx` (`computedP*Net`) and `agreement-preview.tsx` and `agreement-pdf.ts`.
- **Email-merge templates.** `agreements/page.tsx::sendEmail` does its own `tpl.replace(/\{(\w+)\}/g, …)` loop; `legal-terms.ts::renderTerms` does its own `replace` chain; `invoice-pdf.ts` does its own `{due_date}` substitution. Could unify into one `renderTemplate(str, vars)` helper.
- **Number normalisation (`.replace(/[^0-9.]/g, "")`)** is sprinkled across `proposal-form.tsx` (×3), `pipeline/page.tsx`, `proposals/page.tsx`, `proposal-preview.tsx`. Could live in `lib/format.ts`.
- **Settings loader.** `proposals`, `agreements`, `invoices`, `dashboard`, `settings`, and `pipeline` each independently fetch `settings` and roll the rows into a key/value `map`. Consider a server component + context, or a single hook.
- **Status-to-bucket filtering on the pipeline.** `pipeline/page.tsx` filters `clients` by `status === "active" / "paused" / "cancelled"` and `pipeline_contacts` by `status === "warm" / "contacted" / "no_reply" / "idea"`. The two namespaces overlap visually but are completely separate tables, joined only by hand in the UI.

### UI patterns implemented differently per module

- **Edit affordances.** Proposals and Invoices use small `icon-btn` rows (Eye / Pencil / Copy / Trash). Agreements adds a `Send` icon. Clients and Services use full-text `Edit` / `Delete` `btn btn-ghost btn-xs` buttons. Pipeline mixes both — text "Edit / Mark accepted / Mark declined" buttons plus `icon-btn` for delete.
- **Status filtering.** Agreements and Invoices both render a `.tabs` strip with counts. Proposals uses no filter. Pipeline groups by status into separate `<SectionHeader>` blocks instead of tabs.
- **List vs detail.** No module has a real detail page — everything is a list + `<Modal>` form + `<Modal>` preview. Agreements uses `?edit={id}` for deep-linking from Proposals; nothing else does.
- **PDF buttons.** Proposals and Invoices and Agreements all use `<PDFDownloadButton>` in the preview footer. Agreements *also* offers a "Send via email" button + "Mark signed" button next to it. Invoices’ preview wires its own `mailto:` builder (`handleGmail`) directly in `invoice-preview.tsx` instead of going through a shared sender.
- **Phase 1 line items differ between Proposals and Agreements.** Proposals use `LineItemDraft { service_id, title, description, qty, rate }` and the PDF/preview group these into hand-curated tiles. Agreements use `Phase1Item { name, price, description? }` and the form is a flat name+price grid. Converting a proposal to an agreement (`createAgreement` in `proposals/page.tsx`) collapses every proposal line-item to `{ name, price: qty*rate, description }`.
- **Form modals are inconsistent in size.** `Modal` has a `maxWidth` prop. Proposals form: 780. Proposal preview: 720. Agreements form: 860. Agreements preview: 780. Invoice form: 760. Invoice preview: 720. Service modal uses default 520. Client modal: 560. Pipeline prospect modal: 560. No standard size scale.
- **Form sections.** Agreements form uses `<div className="section-header" style={{ margin: 0 }}>` to split its 9 sections. Proposals form uses the same pattern but only twice (Phase 1 / Phase 2). Invoice form has just one section header (Line items). Client/Service forms don’t use section headers at all.
- **Sidebar nav order doesn’t match the URL grouping.** Sidebar lists Dashboard / Invoices / Proposals / Agreements / Pipeline / Clients / Services / Settings. There is no obvious grouping (sales pipeline vs. operational vs. configuration); Pipeline sits between Agreements (closing) and Clients (live), even though it operates on Clients + Pipeline_contacts + Proposals.

### Obvious gaps

- **No detail pages anywhere.** Every entity is opened in a modal. Hard to deep-link an individual proposal or agreement; hard to add comments / activity logs / version history later. The `?edit={id}` deep link is the only exception.
- **No server actions or API routes.** Every mutation (insert/update/delete) runs from the browser via the Supabase client. RLS exists on `agreements` but not on the other tables. Validation is purely client-side; nothing prevents tampering with payloads against the public anon key.
- **`agreements.proposal_number` / `agreements.proposal_date` not in any migration.** The TypeScript types declare them, the page payloads send them, the PDF reads them — but `create_agreements_table.sql` doesn’t add them. They must have been added in Supabase out-of-band; check the live schema before any new migration touches the table.
- **Settings keys aren’t validated.** `settings/page.tsx` knows the 15 keys it manages. `pipeline/page.tsx` writes its own `target_mrr` key not declared anywhere. Adding a settings field in the UI requires editing the `KEYS` array and the `EMPTY` object and the form section — three places.
- **No notion of users/team beyond `auth.users`.** Sidebar shows `user.email` only; no `name`, `role`, or `company` linkage. Nothing ties a record to its creator. RLS lets any authenticated user touch every row.
- **No client → agreement / client → invoice navigation.** A client row has no jump to "their proposals/agreements/invoices". The proposals list shows `client_name` as plain text. Convert/duplicate flows write `client_name` rather than a `client_id`, so the join is fragile.
- **`pipeline/page.tsx::convertToProposal` writes legacy fields.** It populates `phase1_title`, `phase1_price`, `phase2_title`, `phase2_monthly`, `phase2_commitment` (all the legacy strings) — but not the current `p1_items`, `p2_items`, `p2_rate`, `p1_total`. Newly created proposals from the pipeline therefore look empty in the new form (`p1_items` falls back to `EMPTY_LINE`) and the current discount/strike logic doesn’t apply. `nextInvoiceNumber` for proposals isn’t prefixed by `#` here either — `pipeline` produces `"#PROP001"` and stores it as-is.
- **No tests.** Nothing in `package.json`, no `*.test.*` files, no Playwright/Vitest config.
- **No Supabase TypeScript types.** All row shapes are hand-typed in `lib/types.ts` and are drifting from the actual DB (see `agreements.proposal_number`).
- **Console logs in committed code.** `proposals/page.tsx` (multiple), `pipeline/page.tsx` (multiple), `invoice-form.tsx` (one), `agreements/page.tsx` (error logs only). Mostly prefixed `[proposals]` / `[pipeline]` / `[invoice-form]` — clean up before going wider on the user base.
- **Hard-coded company info in PDFs.** `lib/pdf/agreement-pdf.ts` hard-codes `["169 Madison Ave, STE 2733", "New York, NY 10016"]` and `"Pablo Rivera, Founder"` for the Attomik signer — should come from settings (the settings UI already manages `address` and `agreement_legal_entity`, but the PDF doesn’t read them).
- **Capabilities deck is a static file.** The sidebar links to `/capabilities.html`; this lives under `public/` (not checked here in detail) and is unmanaged from inside HQ.
- **No upload/storage.** Nothing in the app touches Supabase Storage. No way to attach signed PDFs back to an agreement, or attach receipts to invoices.
- **`Send via email` is `mailto:` only.** Both Invoices (`handleGmail`) and Agreements (`sendEmail`) shell out to the OS mail client. There’s no transactional email integration; nothing tracks whether the email was actually sent or opened.
- **`invoices.discount` is a percent, but the PDF formats it as if it’s a percent and the dashboard `invoiceTotal()` agrees — yet `agreements.phase1_discount` is currency.** The two parallel mental models will cause bugs when refactoring shared list/preview UI.
- **Sidebar Settings is highlighted by `pathname.startsWith("/settings/")`.** There is no `/settings/...` subroute. Future settings sub-pages already have an active state ready, but for now the regex is over-engineered; the rest of the nav uses an inline boolean.
