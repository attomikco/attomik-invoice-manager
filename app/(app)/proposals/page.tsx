"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  currency,
  dateShort,
  dateISO,
  addDays,
  proposalTotal,
  proposalPhase1Net,
  proposalPhase2Net,
  nextInvoiceNumber,
  lineSubtotal,
} from "@/lib/format";
import { ConfirmDialog } from "@/components/modal";
import {
  EMPTY_LINE,
  toLineItemDraft,
  fromLineItemDraft,
  type Invoice,
  type LineItemDraft,
  type Proposal,
  type Service,
  type SettingsMap,
} from "@/lib/types";
import ProposalForm, {
  type ProposalDraft,
} from "./proposal-form";
import ProposalPreview from "./proposal-preview";

function nextProposalNumber(existing: { number: string | null }[]) {
  return nextInvoiceNumber(existing, "PROP");
}

function emptyDraft(number: string): ProposalDraft {
  const today = dateISO();
  const valid = dateISO(addDays(new Date(), 30));
  return {
    number,
    date: today,
    valid_until: valid,
    status: "draft",
    client_name: "",
    client_email: "",
    client_company: "",
    intro: "",
    notes: "",
    p1_items: [{ ...EMPTY_LINE }],
    p1_discount_amount: "",
    phase1_compare: "10000",
    phase1_note: "",
    phase1_timeline: "20 – 45 days",
    phase1_payment: "$5k to start · $3k on launch",
    p2_items: [{ ...EMPTY_LINE }],
    phase2_title: "",
    p2_discount_amount: "",
    phase2_compare: "",
    phase2_note: "",
    phase2_commitment: "3",
  };
}

export default function ProposalsPage() {
  // eslint-disable-next-line no-console
  console.log("[proposals] ProposalsPage render");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProposalDraft | null>(null);
  const [previewing, setPreviewing] = useState<Proposal | null>(null);
  const [deleting, setDeleting] = useState<Proposal | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    // eslint-disable-next-line no-console
    console.log("[proposals] load() called");
    setLoading(true);
    const { data: servicesData, error: servicesError } = await supabase
      .from("services")
      .select("*")
      .order("price", { ascending: true });
    // eslint-disable-next-line no-console
    console.log(
      "[proposals] services fetch:",
      servicesData?.length,
      servicesError,
    );
    if (servicesError) {
      // eslint-disable-next-line no-console
      console.error(
        "[proposals] services fetch error detail:",
        servicesError.message,
        servicesError.code,
      );
    }
    const [{ data: props }, { data: invs }, { data: stg }] = await Promise.all([
      supabase
        .from("proposals")
        .select("*")
        .order("date", { ascending: false }),
      supabase
        .from("invoices")
        .select("id, number")
        .order("date", { ascending: false })
        .limit(500),
      supabase.from("settings").select("key, value"),
    ]);
    setProposals((props as Proposal[] | null) ?? []);
    setInvoices((invs as Invoice[] | null) ?? []);
    setServices((servicesData as Service[] | null) ?? []);
    const map: SettingsMap = {};
    for (const row of (stg as { key: string; value: string }[] | null) ?? []) {
      (map as Record<string, string>)[row.key] = row.value;
    }
    setSettings(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const currencyCode = settings.currency ?? "USD";

  const stats = useMemo(() => {
    const total = proposals.length;
    const sent = proposals.filter((p) => p.status === "sent").length;
    const accepted = proposals.filter((p) => p.status === "accepted").length;
    const closed = proposals.filter(
      (p) => p.status === "accepted" || p.status === "declined",
    ).length;
    const winRate = closed > 0 ? Math.round((accepted / closed) * 100) : 0;
    const pipelineValue = proposals
      .filter((p) => p.status === "sent")
      .reduce((sum, p) => sum + proposalTotal(p), 0);
    return { total, sent, winRate, pipelineValue };
  }, [proposals]);

  function startNew() {
    setEditing(emptyDraft(nextProposalNumber(proposals)));
  }

  function startEdit(p: Proposal) {
    const rawItems = Array.isArray(p.p1_items) ? p.p1_items : [];
    const p1Items: LineItemDraft[] =
      rawItems.length > 0
        ? rawItems.map((it) => toLineItemDraft(it))
        : [{ ...EMPTY_LINE }];
    const rawP2Items = Array.isArray(p.p2_items) ? p.p2_items : [];
    const p2RateStored = Number(p.p2_rate ?? 0) || 0;
    const p2RateFallback = Number(p.p2_total ?? 0) || 0;
    const p2LegacyRate =
      p2RateStored > 0 ? p2RateStored : p2RateFallback;
    const p2Items: LineItemDraft[] =
      rawP2Items.length > 0
        ? rawP2Items.map((it) => toLineItemDraft(it))
        : p2LegacyRate > 0
          ? [
              {
                service_id: "",
                title: p.phase2_title ?? "Monthly Retainer",
                description: "",
                qty: "1",
                rate: String(p2LegacyRate),
              },
            ]
          : [{ ...EMPTY_LINE }];
    const p2Subtotal = lineSubtotal(
      p2Items.map((it) => ({
        qty: Number(it.qty) || 1,
        rate: Number(it.rate) || 0,
      })),
    );

    const p1Subtotal = lineSubtotal(
      Array.isArray(p.p1_items) ? p.p1_items : [],
    );
    const p1DiscountAmountStored = Number(p.p1_discount_amount ?? 0) || 0;
    const p1DiscountPctLegacy = Number(p.p1_discount ?? 0) || 0;
    const p1DiscountAmount =
      p1DiscountAmountStored > 0
        ? p1DiscountAmountStored
        : p1Subtotal > 0 && p1DiscountPctLegacy > 0
          ? (p1Subtotal * p1DiscountPctLegacy) / 100
          : 0;
    const p1DiscountAmountStr = p1DiscountAmount > 0 ? String(p1DiscountAmount) : "";

    const p2DiscountAmountStored = Number(p.p2_discount_amount ?? 0) || 0;
    const p2DiscountPctLegacy = Number(p.p2_discount ?? 0) || 0;
    const p2DiscountAmount =
      p2DiscountAmountStored > 0
        ? p2DiscountAmountStored
        : p2Subtotal > 0 && p2DiscountPctLegacy > 0
          ? (p2Subtotal * p2DiscountPctLegacy) / 100
          : 0;
    const p2DiscountAmountStr = p2DiscountAmount > 0 ? String(p2DiscountAmount) : "";

    setEditing({
      id: p.id,
      number: p.number ?? nextProposalNumber(proposals),
      date: p.date ?? dateISO(),
      valid_until: p.valid_until ?? dateISO(addDays(new Date(), 30)),
      status: p.status ?? "draft",
      client_name: p.client_name ?? "",
      client_email: p.client_email ?? "",
      client_company: p.client_company ?? "",
      intro: p.intro ?? "",
      notes: p.notes ?? "",
      p1_items: p1Items,
      p1_discount_amount: p1DiscountAmountStr,
      phase1_compare: p.phase1_compare ?? "",
      phase1_note: p.phase1_note ?? "",
      phase1_timeline: p.phase1_timeline ?? "",
      phase1_payment: p.phase1_payment ?? "",
      p2_items: p2Items,
      phase2_title: p.phase2_title ?? "",
      p2_discount_amount: p2DiscountAmountStr,
      phase2_compare: p.phase2_compare ?? "",
      phase2_note: p.phase2_note ?? "",
      phase2_commitment: p.phase2_commitment ?? "",
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const p1Items = editing.p1_items.map((d) => fromLineItemDraft(d));
    const p1Subtotal = lineSubtotal(p1Items);
    const p1DiscountAmt =
      parseFloat(editing.p1_discount_amount || "0") || 0;
    const p1DiscountPct =
      p1Subtotal > 0 && p1DiscountAmt > 0
        ? (p1DiscountAmt / p1Subtotal) * 100
        : 0;
    const p2Items = editing.p2_items.map((d) => fromLineItemDraft(d));
    const p2Subtotal = lineSubtotal(p2Items);
    const p2DiscountAmt =
      parseFloat(editing.p2_discount_amount || "0") || 0;
    const p2DiscountPct =
      p2Subtotal > 0 && p2DiscountAmt > 0
        ? (p2DiscountAmt / p2Subtotal) * 100
        : 0;
    const computedPhase2Title =
      editing.phase2_title?.trim() ||
      (p2Items.length === 1 ? String(p2Items[0].title ?? "") : "") ||
      (p2Items.length > 1 ? "Monthly Retainer" : "");
    const payload = {
      number: editing.number,
      date: editing.date,
      valid_until: editing.valid_until || null,
      status: editing.status,
      client_name: editing.client_name,
      client_email: editing.client_email,
      client_company: editing.client_company,
      intro: editing.intro,
      notes: editing.notes,
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
      p2_rate: p2Subtotal,
      p2_total: p2Subtotal,
      p2_discount_amount: p2DiscountAmt,
      p2_discount: p2DiscountPct,
      phase2_compare: editing.phase2_compare,
      phase2_note: editing.phase2_note,
      phase2_commitment: editing.phase2_commitment,
    };
    const { error } = editing.id
      ? await supabase
          .from("proposals")
          .update(payload)
          .eq("id", editing.id)
      : await supabase.from("proposals").insert(payload);
    setSaving(false);
    if (error) {
      console.error("Save proposal failed:", error);
      alert(`Save failed: ${error.message}`);
      return;
    }
    setEditing(null);
    await load();
  }

  async function handleDelete() {
    if (!deleting) return;
    await supabase.from("proposals").delete().eq("id", deleting.id);
    setDeleting(null);
    await load();
  }

  async function convertToInvoice(p: Proposal) {
    const today = dateISO();
    const due = dateISO(addDays(new Date(), 15));
    const clientFields = {
      client_name: p.client_name,
      client_email: p.client_email,
      client_company: p.client_company,
      client_address: null,
    };

    const p1Items = Array.isArray(p.p1_items) ? p.p1_items : [];
    const p1SubtotalVal = lineSubtotal(p1Items);
    const hasP1 = p1Items.length > 0 && p1SubtotalVal > 0;
    const p1DiscountAmt = Number(p.p1_discount_amount ?? 0) || 0;
    const p1DiscountPct =
      p1DiscountAmt > 0 && p1SubtotalVal > 0
        ? (p1DiscountAmt / p1SubtotalVal) * 100
        : Number(p.p1_discount ?? 0) || 0;

    const p2Items = Array.isArray(p.p2_items) ? p.p2_items : [];
    const p2ItemsSubtotal = lineSubtotal(p2Items);
    const p2RateStored = Number(p.p2_rate ?? 0) || 0;
    const p2RateFallback = Number(p.p2_total ?? 0) || 0;
    const p2Rate =
      p2ItemsSubtotal > 0
        ? p2ItemsSubtotal
        : p2RateStored > 0
          ? p2RateStored
          : p2RateFallback;
    const p2DiscountAmt = Number(p.p2_discount_amount ?? 0) || 0;
    const p2DiscountPctForInvoice =
      p2DiscountAmt > 0 && p2Rate > 0
        ? (p2DiscountAmt / p2Rate) * 100
        : Number(p.p2_discount ?? 0) || 0;
    const p2Net =
      p2DiscountAmt > 0
        ? Math.max(0, p2Rate - p2DiscountAmt)
        : (() => {
            const pct = Number(p.p2_discount ?? 0) || 0;
            return Math.max(0, p2Rate - p2Rate * (pct / 100));
          })();

    if (hasP1) {
      const depositItems = p1Items.map((it) => ({
        service_id: it.service_id ?? null,
        title: (it.title ?? it.name ?? "Service") as string,
        description: (it.description ?? it.desc ?? "") as string,
        qty: Number(it.qty ?? it.quantity ?? 1) || 1,
        rate: Number(it.rate ?? it.price ?? 0) || 0,
      }));
      const invoiceNumber = nextInvoiceNumber(invoices);
      await supabase.from("invoices").insert({
        number: invoiceNumber,
        date: today,
        due,
        status: "draft",
        ...clientFields,
        items: depositItems,
        discount: p1DiscountPct,
        notes: p.notes,
      });
    }

    if (p2Rate > 0) {
      const p2LineItems =
        p2Items.length > 0
          ? p2Items.map((it) => ({
              service_id: it.service_id ?? null,
              title: (it.title ?? it.name ?? "Service") as string,
              description: (it.description ?? it.desc ?? "") as string,
              qty: Number(it.qty ?? it.quantity ?? 1) || 1,
              rate: Number(it.rate ?? it.price ?? 0) || 0,
            }))
          : [
              {
                service_id: null,
                title: p.phase2_title || "Monthly retainer",
                description: "First month retainer",
                qty: 1,
                rate: p2Rate,
              },
            ];
      const p2InvoiceNumber = nextInvoiceNumber([
        ...invoices,
        ...(hasP1 ? [{ id: "tmp", number: null } as Invoice] : []),
      ]);
      await supabase.from("invoices").insert({
        number: p2InvoiceNumber,
        date: today,
        due,
        status: "draft",
        ...clientFields,
        items: p2LineItems,
        discount: p2DiscountPctForInvoice,
        notes: p.notes,
      });
    }

    await supabase
      .from("proposals")
      .update({ status: "accepted" })
      .eq("id", p.id);
    router.push("/invoices");
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1>Proposals</h1>
        </div>
        <div className="flex gap-2">
          <a
            className="btn btn-secondary"
            href="/capabilities.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Capabilities Deck
          </a>
          <button className="btn btn-primary" onClick={startNew}>
            + New proposal
          </button>
        </div>
      </header>

      <section className="grid-4">
        <Kpi label="Total" value={String(stats.total)} hint="all proposals" />
        <Kpi
          label="Open"
          value={String(stats.sent)}
          hint="sent proposals"
          accent
        />
        <Kpi
          label="Win rate"
          value={`${stats.winRate}%`}
          hint="of closed proposals"
        />
        <Kpi
          label="Pipeline value"
          value={currency(stats.pipelineValue, currencyCode)}
          hint="sent proposals"
        />
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
                <th>Number</th>
                <th>Client</th>
                <th>Date</th>
                <th>Valid until</th>
                <th className="td-right">Phase 1</th>
                <th className="td-right">Phase 2</th>
                <th>Status</th>
                <th className="td-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="td-muted">
                    Loading…
                  </td>
                </tr>
              ) : proposals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="td-muted">
                    No proposals yet.
                  </td>
                </tr>
              ) : (
                proposals.map((p) => (
                  <tr key={p.id}>
                    <td className="td-mono td-strong">{p.number ?? "—"}</td>
                    <td>{p.client_name ?? "—"}</td>
                    <td className="td-muted">{dateShort(p.date)}</td>
                    <td className="td-muted">{dateShort(p.valid_until)}</td>
                    <td className="td-right td-mono">
                      {currency(proposalPhase1Net(p), currencyCode)}
                    </td>
                    <td className="td-right td-mono">
                      {proposalPhase2Net(p) > 0
                        ? `${currency(proposalPhase2Net(p), currencyCode)}/mo`
                        : "—"}
                    </td>
                    <td>
                      <span className={`badge status-${p.status ?? "draft"}`}>
                        {p.status ?? "draft"}
                      </span>
                    </td>
                    <td
                      className="td-right"
                      style={{ minWidth: 180, whiteSpace: "nowrap" }}
                    >
                      <div
                        className="flex gap-1"
                        style={{
                          justifyContent: "flex-end",
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setPreviewing(p)}
                          aria-label="Preview"
                          title="Preview"
                        >
                          <Eye size={15} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => startEdit(p)}
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil size={15} strokeWidth={1.75} />
                        </button>
                        {p.status === "accepted" && (
                          <button
                            className="btn btn-dark btn-xs"
                            onClick={() => convertToInvoice(p)}
                          >
                            → Invoice
                          </button>
                        )}
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => setDeleting(p)}
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Trash2 size={15} strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProposalForm
        open={!!editing}
        draft={editing}
        services={services}
        saving={saving}
        onChange={setEditing}
        onClose={() => setEditing(null)}
        onSubmit={handleSave}
      />

      <ProposalPreview
        open={!!previewing}
        proposal={previewing}
        settings={settings}
        onClose={() => setPreviewing(null)}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete proposal?"
        message="This action cannot be undone."
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`kpi-card${accent ? " accent" : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {hint && <div className="kpi-sub">{hint}</div>}
    </div>
  );
}
