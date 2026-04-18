import { createClient } from "@/lib/supabase/server";
import { currency, invoiceTotal, type LineItem } from "@/lib/format";
import MRRChart from "./mrr-chart";

type Invoice = {
  id: string;
  number: string | null;
  date: string | null;
  status: string | null;
  client_name: string | null;
  items: LineItem[] | null;
  discount: number | null;
};

type PipelineContact = {
  id: string;
  name: string | null;
  company: string | null;
  status: string | null;
  monthly_value: number | null;
};

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: invoices }, { data: pipeline }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, number, date, status, client_name, items, discount")
      .order("date", { ascending: false })
      .limit(200),
    supabase
      .from("pipeline_contacts")
      .select("id, name, company, status, monthly_value")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const allInvoices: Invoice[] = (invoices as Invoice[] | null) ?? [];
  const pipelineContacts: PipelineContact[] =
    (pipeline as PipelineContact[] | null) ?? [];

  const paidInvoices = allInvoices.filter((i) => i.status === "paid");
  const outstandingInvoices = allInvoices.filter(
    (i) => i.status !== "paid" && i.status !== "draft",
  );

  const totalRevenue = paidInvoices.reduce(
    (sum, i) => sum + invoiceTotal(i.items, i.discount),
    0,
  );
  const outstanding = outstandingInvoices.reduce(
    (sum, i) => sum + invoiceTotal(i.items, i.discount),
    0,
  );

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const mrr = paidInvoices
    .filter((i) => i.date && i.date.startsWith(currentMonth))
    .reduce((sum, i) => sum + invoiceTotal(i.items, i.discount), 0);

  const mrrByMonth = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    mrrByMonth.set(key, 0);
  }
  for (const inv of paidInvoices) {
    if (!inv.date) continue;
    const key = inv.date.slice(0, 7);
    if (mrrByMonth.has(key)) {
      mrrByMonth.set(
        key,
        (mrrByMonth.get(key) ?? 0) + invoiceTotal(inv.items, inv.discount),
      );
    }
  }
  const chartData = Array.from(mrrByMonth.entries()).map(([month, value]) => ({
    month,
    value,
  }));

  const activePipelineValue = pipelineContacts
    .filter((c) => c.status === "active" || c.status === "warm")
    .reduce((sum, c) => sum + Number(c.monthly_value ?? 0), 0);

  const recentInvoices = allInvoices.slice(0, 6);

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <div
            className="label mono"
            style={{ marginBottom: "var(--sp-2)" }}
          >
            00 / Dashboard
          </div>
          <h1>Today.</h1>
        </div>
        <div className="label mono">
          {now.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </header>

      <section className="grid-4">
        <KpiCard label="MRR" value={currency(mrr)} hint="this month" />
        <KpiCard
          label="Total revenue"
          value={currency(totalRevenue)}
          hint={`${paidInvoices.length} paid invoices`}
        />
        <KpiCard
          label="Outstanding"
          value={currency(outstanding)}
          hint={`${outstandingInvoices.length} unpaid`}
          accent
        />
        <KpiCard
          label="Pipeline"
          value={currency(activePipelineValue)}
          hint={`${pipelineContacts.length} contacts`}
        />
      </section>

      <div className="section-header">
        <div className="section-header-bar" />
        <div className="section-header-title">Revenue · 12-month trend</div>
        <div className="section-header-line" />
      </div>

      <section className="card">
        <MRRChart data={chartData} />
      </section>

      <div className="section-header">
        <div className="section-header-bar" />
        <div className="section-header-title">Activity</div>
        <div className="section-header-line" />
      </div>

      <section className="grid-2">
        <div className="card">
          <div style={{ marginBottom: "var(--sp-5)" }}>
            <div className="label mono">Pipeline</div>
            <h2 style={{ marginTop: "var(--sp-1)" }}>Active &amp; warm</h2>
          </div>
          {pipelineContacts.length === 0 ? (
            <div className="caption mono">No contacts yet</div>
          ) : (
            <ul style={{ listStyle: "none" }}>
              {pipelineContacts.slice(0, 6).map((c, idx) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: "var(--sp-3) 0",
                    borderBottom:
                      idx < pipelineContacts.slice(0, 6).length - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "var(--text-base)",
                        fontWeight: "var(--fw-medium)",
                        color: "var(--ink)",
                      }}
                    >
                      {c.name ?? "—"}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: "var(--fs-11)",
                        letterSpacing: "var(--ls-wide)",
                        textTransform: "uppercase",
                        color: "var(--muted)",
                        marginTop: "var(--sp-1)",
                      }}
                    >
                      {c.company ?? ""}{" "}
                      <span
                        className={`badge status-${c.status ?? "draft"}`}
                        style={{ marginLeft: "var(--sp-2)" }}
                      >
                        {c.status ?? "idea"}
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
                    {currency(Number(c.monthly_value ?? 0))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div style={{ marginBottom: "var(--sp-5)" }}>
            <div className="label mono">Recent invoices</div>
            <h2 style={{ marginTop: "var(--sp-1)" }}>Latest activity</h2>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="caption mono">No invoices yet</div>
          ) : (
            <ul style={{ listStyle: "none" }}>
              {recentInvoices.map((inv, idx) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: "var(--sp-3) 0",
                    borderBottom:
                      idx < recentInvoices.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "var(--text-base)",
                        fontWeight: "var(--fw-medium)",
                        color: "var(--ink)",
                      }}
                    >
                      {inv.client_name ?? "Untitled"}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: "var(--fs-11)",
                        letterSpacing: "var(--ls-wide)",
                        textTransform: "uppercase",
                        color: "var(--muted)",
                        marginTop: "var(--sp-1)",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--sp-2)",
                      }}
                    >
                      <span>{inv.number ?? "—"}</span>
                      <span
                        className={`badge status-${inv.status ?? "draft"}`}
                      >
                        {inv.status ?? "draft"}
                      </span>
                      <span>{inv.date ?? ""}</span>
                    </div>
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--fw-semibold)",
                    }}
                  >
                    {currency(invoiceTotal(inv.items, inv.discount))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({
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
