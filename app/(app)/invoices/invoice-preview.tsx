"use client";

import { useMemo } from "react";
import { currency, dateShort, lineSubtotal } from "@/lib/format";
import { Modal } from "@/components/modal";
import type { Invoice, SettingsMap } from "@/lib/types";

export default function InvoicePreview({
  open,
  invoice,
  settings,
  onClose,
}: {
  open: boolean;
  invoice: Invoice | null;
  settings: SettingsMap;
  onClose: () => void;
}) {
  const subtotal = useMemo(
    () => lineSubtotal(invoice?.items),
    [invoice?.items],
  );
  const discountPct = Number(invoice?.discount ?? 0);
  const discountAmt = subtotal * (discountPct / 100);
  const total = Math.max(0, subtotal - discountAmt);
  const code = settings.currency ?? "USD";

  function handlePrint() {
    if (!invoice) return;
    const html = renderPrintHTML(invoice, settings);
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  function handleGmail() {
    if (!invoice) return;
    const to = invoice.client_email ?? "";
    const subject = encodeURIComponent(
      `Invoice ${invoice.number ?? ""} · ${settings.brand_name ?? "Attomik"}`,
    );
    const body = encodeURIComponent(
      [
        `Hi${invoice.client_name ? ` ${invoice.client_name}` : ""},`,
        ``,
        `Please find attached invoice ${invoice.number ?? ""} for ${currency(total, code)}.`,
        `Due: ${dateShort(invoice.due)}`,
        ``,
        settings.payment_instructions ?? "",
        ``,
        `Thanks,`,
        settings.brand_name ?? "",
      ].join("\n"),
    );
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }

  if (!invoice) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Preview · ${invoice.number ?? "Invoice"}`}
      maxWidth={720}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">
            Close
          </button>
          <button
            className="btn btn-secondary"
            onClick={handlePrint}
            type="button"
          >
            Print / PDF
          </button>
          <button
            className="btn btn-primary"
            onClick={handleGmail}
            type="button"
            disabled={!invoice.client_email}
          >
            Send via email
          </button>
        </>
      }
    >
      <div
        className="card-muted"
        style={{
          padding: "var(--sp-7)",
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "var(--sp-7)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: "var(--fw-heading)",
                letterSpacing: "var(--ls-tight)",
              }}
            >
              {settings.brand_name ?? "Attomik"}
            </div>
            {settings.legal_name && (
              <div className="caption">{settings.legal_name}</div>
            )}
            {settings.address && (
              <div
                className="caption"
                style={{ whiteSpace: "pre-line", marginTop: "var(--sp-1)" }}
              >
                {settings.address}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="label mono">Invoice</div>
            <div
              className="mono"
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: "var(--fw-bold)",
              }}
            >
              {invoice.number ?? "—"}
            </div>
            <div
              className="caption mono"
              style={{ marginTop: "var(--sp-2)" }}
            >
              Issued {dateShort(invoice.date)}
            </div>
            <div className="caption mono">
              Due {dateShort(invoice.due)}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "var(--sp-6)",
            padding: "var(--sp-5) 0",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            marginBottom: "var(--sp-5)",
          }}
        >
          <div>
            <div className="label mono">Bill to</div>
            <div
              style={{
                fontWeight: "var(--fw-semibold)",
                marginTop: "var(--sp-1)",
              }}
            >
              {invoice.client_name ?? "—"}
            </div>
            {invoice.client_company && (
              <div className="caption">{invoice.client_company}</div>
            )}
            {invoice.client_email && (
              <div className="caption mono">{invoice.client_email}</div>
            )}
            {invoice.client_address && (
              <div className="caption" style={{ whiteSpace: "pre-line" }}>
                {invoice.client_address}
              </div>
            )}
          </div>
          <div>
            <div className="label mono">Status</div>
            <span
              className={`badge status-${invoice.status ?? "draft"}`}
              style={{ marginTop: "var(--sp-1)" }}
            >
              {invoice.status ?? "draft"}
            </span>
          </div>
        </div>

        <table style={{ marginBottom: "var(--sp-5)" }}>
          <thead>
            <tr>
              <th>Item</th>
              <th className="td-right">Qty</th>
              <th className="td-right">Rate</th>
              <th className="td-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items ?? []).map((it, i) => {
              const qty = Number(it.qty ?? it.quantity ?? 1);
              const rate = Number(it.rate ?? it.price ?? 0);
              return (
                <tr key={i}>
                  <td>
                    <div className="td-strong">{it.title ?? "—"}</div>
                    {it.description && (
                      <div className="caption">{it.description}</div>
                    )}
                  </td>
                  <td className="td-right td-mono">{qty}</td>
                  <td className="td-right td-mono">{currency(rate, code)}</td>
                  <td className="td-right td-mono">
                    {currency(qty * rate, code)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div style={{ minWidth: 240 }}>
            <Row label="Subtotal" value={currency(subtotal, code)} />
            {discountPct > 0 && (
              <Row
                label={`Discount (${discountPct}%)`}
                value={`− ${currency(discountAmt, code)}`}
              />
            )}
            <Row label="Total" value={currency(total, code)} emphasis />
          </div>
        </div>

        {invoice.notes && (
          <div
            style={{
              marginTop: "var(--sp-6)",
              paddingTop: "var(--sp-5)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div className="label mono">Notes</div>
            <p
              className="caption"
              style={{ whiteSpace: "pre-line", marginTop: "var(--sp-2)" }}
            >
              {invoice.notes}
            </p>
          </div>
        )}

        {settings.payment_instructions && (
          <div
            style={{
              marginTop: "var(--sp-5)",
              paddingTop: "var(--sp-5)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div className="label mono">Payment</div>
            <p
              className="caption"
              style={{ whiteSpace: "pre-line", marginTop: "var(--sp-2)" }}
            >
              {settings.payment_instructions}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "var(--sp-2) 0",
        fontSize: emphasis ? "var(--text-md)" : "var(--text-base)",
        fontWeight: emphasis ? "var(--fw-bold)" : "var(--fw-normal)",
        borderTop: emphasis ? "1px solid var(--border)" : "none",
        marginTop: emphasis ? "var(--sp-2)" : 0,
      }}
    >
      <span className={emphasis ? undefined : "text-muted"}>{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}

function renderPrintHTML(inv: Invoice, s: SettingsMap): string {
  const code = s.currency ?? "USD";
  const subtotal = lineSubtotal(inv.items);
  const discPct = Number(inv.discount ?? 0);
  const discAmt = subtotal * (discPct / 100);
  const total = Math.max(0, subtotal - discAmt);

  const rows = (inv.items ?? [])
    .map((it) => {
      const qty = Number(it.qty ?? it.quantity ?? 1);
      const rate = Number(it.rate ?? it.price ?? 0);
      return `<tr>
        <td>
          <div style="font-weight:700;">${escape(it.title ?? "")}</div>
          ${it.description ? `<div style="color:#777;font-size:12px;">${escape(it.description as string)}</div>` : ""}
        </td>
        <td style="text-align:right;font-family:'DM Mono',monospace;">${qty}</td>
        <td style="text-align:right;font-family:'DM Mono',monospace;">${currency(rate, code)}</td>
        <td style="text-align:right;font-family:'DM Mono',monospace;">${currency(qty * rate, code)}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<title>${escape(inv.number ?? "Invoice")}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&family=DM+Mono&display=swap"/>
<style>
  *{box-sizing:border-box;}
  body{font-family:'Barlow',sans-serif;color:#000;padding:48px;max-width:800px;margin:0 auto;}
  h1{font-size:28px;font-weight:900;letter-spacing:-0.04em;margin:0;}
  .mono{font-family:'DM Mono',monospace;}
  .label{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#555;font-weight:600;}
  .caption{font-size:13px;color:#555;line-height:1.5;}
  table{width:100%;border-collapse:collapse;margin:24px 0;}
  th{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#555;font-weight:700;padding:10px 0;border-bottom:1px solid #e0e0e0;text-align:left;}
  td{padding:12px 0;border-bottom:1px solid #f2f2f2;}
  .row{display:flex;justify-content:space-between;padding:6px 0;}
  .row.total{font-weight:700;border-top:1px solid #000;margin-top:8px;padding-top:10px;}
  .head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;background:#e6fff5;color:#007a48;}
  @media print {body{padding:20px;}}
</style>
</head>
<body>
<div class="head">
  <div>
    <h1>${escape(s.brand_name ?? "Attomik")}</h1>
    ${s.legal_name ? `<div class="caption">${escape(s.legal_name)}</div>` : ""}
    ${s.address ? `<div class="caption" style="white-space:pre-line;">${escape(s.address)}</div>` : ""}
  </div>
  <div style="text-align:right;">
    <div class="label">Invoice</div>
    <div class="mono" style="font-size:18px;font-weight:700;">${escape(inv.number ?? "")}</div>
    <div class="caption mono">Issued ${dateShort(inv.date)}</div>
    <div class="caption mono">Due ${dateShort(inv.due)}</div>
  </div>
</div>
<div style="display:flex;justify-content:space-between;padding:16px 0;border-top:1px solid #e0e0e0;border-bottom:1px solid #e0e0e0;">
  <div>
    <div class="label">Bill to</div>
    <div style="font-weight:600;">${escape(inv.client_name ?? "")}</div>
    ${inv.client_company ? `<div class="caption">${escape(inv.client_company)}</div>` : ""}
    ${inv.client_email ? `<div class="caption mono">${escape(inv.client_email)}</div>` : ""}
    ${inv.client_address ? `<div class="caption" style="white-space:pre-line;">${escape(inv.client_address)}</div>` : ""}
  </div>
  <div><div class="label">Status</div><span class="badge">${escape(inv.status ?? "draft")}</span></div>
</div>
<table>
  <thead><tr><th>Item</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Rate</th><th style="text-align:right;">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div style="display:flex;justify-content:flex-end;">
  <div style="min-width:260px;">
    <div class="row"><span class="caption">Subtotal</span><span class="mono">${currency(subtotal, code)}</span></div>
    ${discPct > 0 ? `<div class="row"><span class="caption">Discount (${discPct}%)</span><span class="mono">− ${currency(discAmt, code)}</span></div>` : ""}
    <div class="row total"><span>Total</span><span class="mono">${currency(total, code)}</span></div>
  </div>
</div>
${inv.notes ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e0e0e0;"><div class="label">Notes</div><p class="caption" style="white-space:pre-line;">${escape(inv.notes)}</p></div>` : ""}
${s.payment_instructions ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid #e0e0e0;"><div class="label">Payment</div><p class="caption" style="white-space:pre-line;">${escape(s.payment_instructions)}</p></div>` : ""}
</body></html>`;
}

function escape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
