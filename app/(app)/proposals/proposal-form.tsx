"use client";

import { useMemo } from "react";
import { currency, lineSubtotal } from "@/lib/format";
import { Modal } from "@/components/modal";
import {
  EMPTY_LINE,
  type Client,
  type LineItemDraft,
  type Service,
} from "@/lib/types";

export type ProposalDraft = {
  id?: string;
  number: string;
  date: string;
  valid_until: string;
  status: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_company: string;
  intro: string;
  items: LineItemDraft[];
  discount: string;
  notes: string;
  phase1_title: string;
  phase1_price: string;
  phase1_timeline: string;
  phase1_payment: string;
  phase2_title: string;
  phase2_monthly: string;
  phase2_commitment: string;
};

export default function ProposalForm({
  open,
  draft,
  clients,
  services,
  saving,
  currencyCode,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  draft: ProposalDraft | null;
  clients: Client[];
  services: Service[];
  saving: boolean;
  currencyCode: string;
  onChange: (d: ProposalDraft) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const subtotal = useMemo(() => {
    if (!draft) return 0;
    return lineSubtotal(
      draft.items.map((it) => ({
        qty: Number(it.qty),
        rate: Number(it.rate),
      })),
    );
  }, [draft]);

  if (!draft) return null;

  const discPct = Number(draft.discount) || 0;
  const total = Math.max(0, subtotal - subtotal * (discPct / 100));

  function pickClient(id: string) {
    if (!draft) return;
    if (!id) {
      onChange({ ...draft, client_id: "" });
      return;
    }
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    onChange({
      ...draft,
      client_id: id,
      client_name: c.name ?? "",
      client_email: c.email ?? "",
      client_company: c.company ?? "",
    });
  }

  function updateLine(i: number, patch: Partial<LineItemDraft>) {
    if (!draft) return;
    const items = draft.items.map((it, idx) =>
      idx === i ? { ...it, ...patch } : it,
    );
    onChange({ ...draft, items });
  }

  function pickService(i: number, id: string) {
    if (!draft) return;
    if (!id) {
      updateLine(i, { service_id: "" });
      return;
    }
    const s = services.find((x) => x.id === id);
    if (!s) return;
    updateLine(i, {
      service_id: id,
      title: draft.items[i].title || (s.name ?? ""),
      description: draft.items[i].description || (s.description ?? ""),
      rate: String(s.price ?? 0),
    });
  }

  function addLine() {
    if (!draft) return;
    onChange({ ...draft, items: [...draft.items, { ...EMPTY_LINE }] });
  }

  function removeLine(i: number) {
    if (!draft) return;
    onChange({
      ...draft,
      items: draft.items.filter((_, idx) => idx !== i),
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={draft.id ? `Edit ${draft.number}` : "New proposal"}
      maxWidth={780}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="proposal-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save proposal"}
          </button>
        </>
      }
    >
      <form
        id="proposal-form"
        onSubmit={onSubmit}
        className="flex-col"
        style={{ gap: "var(--sp-5)" }}
      >
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Number</label>
            <input
              className="mono"
              required
              value={draft.number}
              onChange={(e) => onChange({ ...draft, number: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              required
              value={draft.date}
              onChange={(e) => onChange({ ...draft, date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Valid until</label>
            <input
              type="date"
              value={draft.valid_until}
              onChange={(e) =>
                onChange({ ...draft, valid_until: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              value={draft.status}
              onChange={(e) => onChange({ ...draft, status: e.target.value })}
            >
              <option value="draft">draft</option>
              <option value="sent">sent</option>
              <option value="accepted">accepted</option>
              <option value="declined">declined</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Client (from list)</label>
            <select
              value={draft.client_id}
              onChange={(e) => pickClient(e.target.value)}
            >
              <option value="">— choose or enter manually —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` · ${c.company}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Client name</label>
            <input
              value={draft.client_name}
              onChange={(e) =>
                onChange({ ...draft, client_name: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Client email</label>
            <input
              type="email"
              value={draft.client_email}
              onChange={(e) =>
                onChange({ ...draft, client_email: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Company</label>
            <input
              value={draft.client_company}
              onChange={(e) =>
                onChange({ ...draft, client_company: e.target.value })
              }
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Intro message</label>
          <textarea
            rows={4}
            value={draft.intro}
            onChange={(e) => onChange({ ...draft, intro: e.target.value })}
          />
        </div>

        <div className="section-header" style={{ margin: 0 }}>
          <div className="section-header-bar" />
          <div className="section-header-title">Scope · line items</div>
          <div className="section-header-line" />
        </div>

        <div className="flex-col" style={{ gap: "var(--sp-3)" }}>
          {draft.items.map((it, i) => {
            const qty = Number(it.qty) || 0;
            const rate = Number(it.rate) || 0;
            return (
              <div
                key={i}
                className="card-sm"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--sp-3)",
                  background: "var(--gray-150)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Service</label>
                    <select
                      value={it.service_id}
                      onChange={(e) => pickService(i, e.target.value)}
                    >
                      <option value="">— choose service —</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {currency(Number(s.price ?? 0), currencyCode)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input
                      value={it.title}
                      onChange={(e) => updateLine(i, { title: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    rows={2}
                    value={it.description}
                    onChange={(e) =>
                      updateLine(i, { description: e.target.value })
                    }
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 160px 1fr auto",
                    gap: "var(--sp-3)",
                    alignItems: "end",
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Qty</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.qty}
                      onChange={(e) => updateLine(i, { qty: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.rate}
                      onChange={(e) => updateLine(i, { rate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Line total</label>
                    <div
                      className="mono"
                      style={{
                        padding: "10px var(--sp-3)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--r-sm)",
                        background: "var(--paper)",
                        fontWeight: "var(--fw-semibold)",
                      }}
                    >
                      {currency(qty * rate, currencyCode)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => removeLine(i)}
                    disabled={draft.items.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={addLine}
            style={{ alignSelf: "flex-start" }}
          >
            + Add line
          </button>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Discount %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={draft.discount}
              onChange={(e) =>
                onChange({ ...draft, discount: e.target.value })
              }
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              alignItems: "flex-end",
              gap: "var(--sp-1)",
            }}
          >
            <div
              className="mono label"
              style={{ color: "var(--muted)" }}
            >
              Subtotal {currency(subtotal, currencyCode)}
            </div>
            <div
              className="mono"
              style={{
                fontSize: "var(--text-xl)",
                fontWeight: "var(--fw-bold)",
              }}
            >
              Total {currency(total, currencyCode)}
            </div>
          </div>
        </div>

        <div className="section-header" style={{ margin: 0 }}>
          <div className="section-header-bar" />
          <div className="section-header-title">Phase 1 · delivery</div>
          <div className="section-header-line" />
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              value={draft.phase1_title}
              onChange={(e) =>
                onChange({ ...draft, phase1_title: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Price</label>
            <input
              value={draft.phase1_price}
              onChange={(e) =>
                onChange({ ...draft, phase1_price: e.target.value })
              }
              placeholder="e.g. $8,500"
            />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Timeline</label>
            <input
              value={draft.phase1_timeline}
              onChange={(e) =>
                onChange({ ...draft, phase1_timeline: e.target.value })
              }
              placeholder="e.g. 3 weeks"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Payment terms</label>
            <input
              value={draft.phase1_payment}
              onChange={(e) =>
                onChange({ ...draft, phase1_payment: e.target.value })
              }
              placeholder="e.g. 50% upfront, 50% on delivery"
            />
          </div>
        </div>

        <div className="section-header" style={{ margin: 0 }}>
          <div className="section-header-bar" />
          <div className="section-header-title">Phase 2 · partnership</div>
          <div className="section-header-line" />
        </div>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              value={draft.phase2_title}
              onChange={(e) =>
                onChange({ ...draft, phase2_title: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Monthly rate</label>
            <input
              value={draft.phase2_monthly}
              onChange={(e) =>
                onChange({ ...draft, phase2_monthly: e.target.value })
              }
              placeholder="e.g. $3,500/mo"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Commitment</label>
            <input
              value={draft.phase2_commitment}
              onChange={(e) =>
                onChange({ ...draft, phase2_commitment: e.target.value })
              }
              placeholder="e.g. 6 months"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            rows={3}
            value={draft.notes}
            onChange={(e) => onChange({ ...draft, notes: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
}
