"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  currency,
  dateShort,
  dateISO,
  invoiceTotal,
  type LineItem,
} from "@/lib/format";
import { Modal, ConfirmDialog } from "@/components/modal";

type Contact = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  status: string | null;
  notes: string | null;
  monthly_value: number | null;
  last_contact: string | null;
};

type Invoice = {
  id: string;
  client_name: string | null;
  date: string | null;
  status: string | null;
  items: LineItem[] | null;
  discount: number | null;
};

type Proposal = {
  id: string;
  number: string | null;
  client_name: string | null;
  status: string | null;
  items: LineItem[] | null;
  discount: number | null;
  date: string | null;
};

type Draft = {
  id?: string;
  name: string;
  company: string;
  email: string;
  status: string;
  notes: string;
  monthly_value: string;
  last_contact: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  company: "",
  email: "",
  status: "idea",
  notes: "",
  monthly_value: "0",
  last_contact: "",
};

const STATUS_OPTIONS = [
  "idea",
  "contacted",
  "warm",
  "no_reply",
  "active",
] as const;

const TARGET_MRR = 25000;

export default function PipelinePage() {
  const supabase = useMemo(() => createClient(), []);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cData }, { data: iData }, { data: pData }] =
      await Promise.all([
        supabase
          .from("pipeline_contacts")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("invoices")
          .select("id, client_name, date, status, items, discount")
          .order("date", { ascending: false })
          .limit(200),
        supabase
          .from("proposals")
          .select("id, number, client_name, status, items, discount, date")
          .order("date", { ascending: false })
          .limit(200),
      ]);
    setContacts((cData as Contact[] | null) ?? []);
    setInvoices((iData as Invoice[] | null) ?? []);
    setProposals((pData as Proposal[] | null) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const fixedMRR = useMemo(() => {
    return contacts
      .filter((c) => c.status === "active")
      .reduce((sum, c) => sum + Number(c.monthly_value ?? 0), 0);
  }, [contacts]);

  const warmPipeline = useMemo(() => {
    return contacts
      .filter((c) => c.status === "warm" || c.status === "contacted")
      .reduce((sum, c) => sum + Number(c.monthly_value ?? 0), 0);
  }, [contacts]);

  const gap = Math.max(0, TARGET_MRR - fixedMRR);

  const activeClients = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const byClient = new Map<
      string,
      { total: number; latestStatus: string | null; date: string | null }
    >();
    for (const inv of invoices) {
      if (!inv.client_name || !inv.date) continue;
      if (!inv.date.startsWith(currentMonth)) continue;
      if (inv.status === "draft") continue;
      const key = inv.client_name;
      const prev = byClient.get(key);
      const total = invoiceTotal(inv.items, inv.discount);
      byClient.set(key, {
        total: (prev?.total ?? 0) + total,
        latestStatus: inv.status,
        date: inv.date,
      });
    }
    return Array.from(byClient.entries()).map(([name, v]) => ({
      name,
      ...v,
    }));
  }, [invoices]);

  const warmLeads = useMemo(() => {
    return proposals.filter(
      (p) => p.status === "sent" || p.status === "draft",
    );
  }, [proposals]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const payload = {
      name: editing.name,
      company: editing.company,
      email: editing.email,
      status: editing.status,
      notes: editing.notes,
      monthly_value: Number(editing.monthly_value) || 0,
      last_contact: editing.last_contact || null,
    };
    if (editing.id) {
      await supabase
        .from("pipeline_contacts")
        .update(payload)
        .eq("id", editing.id);
    } else {
      await supabase.from("pipeline_contacts").insert(payload);
    }
    setSaving(false);
    setEditing(null);
    await load();
  }

  async function handleDelete() {
    if (!deleting) return;
    await supabase.from("pipeline_contacts").delete().eq("id", deleting.id);
    setDeleting(null);
    await load();
  }

  async function markContacted(c: Contact) {
    await supabase
      .from("pipeline_contacts")
      .update({ status: "contacted", last_contact: dateISO() })
      .eq("id", c.id);
    await load();
  }

  async function appendNote(c: Contact) {
    const note = window.prompt("Add a note", "");
    if (!note) return;
    const stamp = dateISO();
    const next = c.notes
      ? `${c.notes}\n[${stamp}] ${note}`
      : `[${stamp}] ${note}`;
    await supabase
      .from("pipeline_contacts")
      .update({ notes: next, last_contact: stamp })
      .eq("id", c.id);
    await load();
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <div className="label mono" style={{ marginBottom: "var(--sp-2)" }}>
            03 / Pipeline
          </div>
          <h1>Pipeline.</h1>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setEditing({ ...EMPTY_DRAFT })}
        >
          + New prospect
        </button>
      </header>

      <section className="grid-4">
        <Kpi label="Fixed MRR" value={currency(fixedMRR)} hint="active clients" accent />
        <Kpi label="Warm pipeline" value={currency(warmPipeline)} hint="projected monthly" />
        <Kpi label="Target MRR" value={currency(TARGET_MRR)} hint="goal" />
        <Kpi
          label="Gap to target"
          value={currency(gap)}
          hint={`${gap === 0 ? "on target" : "to reach goal"}`}
        />
      </section>

      <div className="section-header">
        <div className="section-header-bar" />
        <div className="section-header-title">
          Active clients · this month
        </div>
        <div className="section-header-line" />
      </div>
      <div className="card">
        {activeClients.length === 0 ? (
          <div className="caption mono">No billed clients this month.</div>
        ) : (
          <ul style={{ listStyle: "none" }}>
            {activeClients.map((c, i) => (
              <li
                key={c.name}
                className="flex items-center justify-between"
                style={{
                  padding: "var(--sp-3) 0",
                  borderBottom:
                    i < activeClients.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--fw-semibold)",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: "var(--fs-11)",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "var(--ls-wide)",
                      marginTop: "var(--sp-1)",
                      display: "flex",
                      gap: "var(--sp-2)",
                      alignItems: "center",
                    }}
                  >
                    <span
                      className={`badge status-${c.latestStatus ?? "draft"}`}
                    >
                      {c.latestStatus ?? "draft"}
                    </span>
                    <span>{dateShort(c.date)}</span>
                  </div>
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--fw-semibold)",
                  }}
                >
                  {currency(c.total)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="section-header">
        <div className="section-header-bar" />
        <div className="section-header-title">Warm leads · proposals</div>
        <div className="section-header-line" />
      </div>
      <div className="card">
        {warmLeads.length === 0 ? (
          <div className="caption mono">No open proposals.</div>
        ) : (
          <ul style={{ listStyle: "none" }}>
            {warmLeads.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between"
                style={{
                  padding: "var(--sp-3) 0",
                  borderBottom:
                    i < warmLeads.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--fw-semibold)",
                    }}
                  >
                    {p.client_name ?? "Untitled"}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: "var(--fs-11)",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "var(--ls-wide)",
                      marginTop: "var(--sp-1)",
                      display: "flex",
                      gap: "var(--sp-2)",
                      alignItems: "center",
                    }}
                  >
                    <span>{p.number ?? "—"}</span>
                    <span className={`badge status-${p.status ?? "draft"}`}>
                      {p.status ?? "draft"}
                    </span>
                  </div>
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--fw-semibold)",
                  }}
                >
                  {currency(invoiceTotal(p.items, p.discount))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="section-header">
        <div className="section-header-bar" />
        <div className="section-header-title">Prospects CRM</div>
        <div className="section-header-line" />
      </div>
      <div className="table-wrapper">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Status</th>
                <th className="td-right">Monthly value</th>
                <th>Last contact</th>
                <th>Notes</th>
                <th className="td-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="td-muted">
                    Loading…
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="td-muted">
                    No prospects yet.
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c.id}>
                    <td className="td-strong">{c.name ?? "—"}</td>
                    <td className="td-muted">{c.company ?? "—"}</td>
                    <td>
                      <span className={`badge status-${c.status ?? "draft"}`}>
                        {c.status ?? "idea"}
                      </span>
                    </td>
                    <td className="td-right td-mono">
                      {currency(Number(c.monthly_value ?? 0))}
                    </td>
                    <td className="td-muted">{dateShort(c.last_contact)}</td>
                    <td
                      className="td-muted"
                      style={{
                        maxWidth: 260,
                        whiteSpace: "normal",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      {c.notes ? (
                        <span
                          className="truncate"
                          style={{
                            display: "block",
                            maxWidth: 260,
                          }}
                          title={c.notes}
                        >
                          {c.notes.split("\n").slice(-1)[0]}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="td-right">
                      <div
                        className="flex gap-2"
                        style={{ justifyContent: "flex-end", flexWrap: "wrap" }}
                      >
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => markContacted(c)}
                        >
                          Contacted
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => appendNote(c)}
                        >
                          + Note
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() =>
                            setEditing({
                              id: c.id,
                              name: c.name ?? "",
                              company: c.company ?? "",
                              email: c.email ?? "",
                              status: c.status ?? "idea",
                              notes: c.notes ?? "",
                              monthly_value: String(c.monthly_value ?? 0),
                              last_contact: c.last_contact ?? "",
                            })
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => setDeleting(c)}
                        >
                          Delete
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

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit prospect" : "New prospect"}
        maxWidth={560}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="prospect-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save prospect"}
            </button>
          </>
        }
      >
        {editing && (
          <form
            id="prospect-form"
            onSubmit={handleSave}
            className="flex-col"
            style={{ gap: "var(--sp-4)" }}
          >
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  required
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input
                  value={editing.company}
                  onChange={(e) =>
                    setEditing({ ...editing, company: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={editing.email}
                onChange={(e) =>
                  setEditing({ ...editing, email: e.target.value })
                }
              />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value })
                  }
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly value (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editing.monthly_value}
                  onChange={(e) =>
                    setEditing({ ...editing, monthly_value: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Last contact</label>
              <input
                type="date"
                value={editing.last_contact}
                onChange={(e) =>
                  setEditing({ ...editing, last_contact: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                rows={4}
                value={editing.notes}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
              />
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete prospect?"
        message={`Remove ${deleting?.name ?? "this prospect"} from the pipeline?`}
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
