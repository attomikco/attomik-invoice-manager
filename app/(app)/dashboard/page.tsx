import { createClient } from "@/lib/supabase/server";
import MRRChart from "./mrr-chart";

type Invoice = {
  id: string;
  number: string | null;
  date: string | null;
  status: string | null;
  client_name: string | null;
  items: { price?: number; qty?: number; quantity?: number }[] | null;
  discount: number | null;
};

type PipelineContact = {
  id: string;
  name: string | null;
  company: string | null;
  status: string | null;
  monthly_value: number | null;
};

function invoiceTotal(inv: Invoice): number {
  const items = Array.isArray(inv.items) ? inv.items : [];
  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.qty ?? item.quantity ?? 1);
    const price = Number(item.price ?? 0);
    return sum + qty * price;
  }, 0);
  return Math.max(0, subtotal - Number(inv.discount ?? 0));
}

function currency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

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
    (sum, i) => sum + invoiceTotal(i),
    0,
  );
  const outstanding = outstandingInvoices.reduce(
    (sum, i) => sum + invoiceTotal(i),
    0,
  );

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const mrr = paidInvoices
    .filter((i) => i.date && i.date.startsWith(currentMonth))
    .reduce((sum, i) => sum + invoiceTotal(i), 0);

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
      mrrByMonth.set(key, (mrrByMonth.get(key) ?? 0) + invoiceTotal(inv));
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
    <div className="p-8 lg:p-12 space-y-12">
      <header className="flex items-end justify-between">
        <div>
          <div className="mono text-[10px] uppercase tracking-widest text-black/40 mb-2">
            00 / Dashboard
          </div>
          <h1 className="text-5xl font-heading font-extrabold tracking-tight">
            Today.
          </h1>
        </div>
        <div className="mono text-[10px] uppercase tracking-widest text-black/40">
          {now.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="MRR" value={currency(mrr)} hint="this month" />
        <StatCard
          label="Total revenue"
          value={currency(totalRevenue)}
          hint={`${paidInvoices.length} paid invoices`}
        />
        <StatCard
          label="Outstanding"
          value={currency(outstanding)}
          hint={`${outstandingInvoices.length} unpaid`}
          accent
        />
        <StatCard
          label="Pipeline"
          value={currency(activePipelineValue)}
          hint={`${pipelineContacts.length} contacts`}
        />
      </section>

      <section className="border border-black/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="mono text-[10px] uppercase tracking-widest text-black/40">
              Revenue
            </div>
            <h2 className="text-2xl font-heading font-extrabold mt-1">
              12-month trend
            </h2>
          </div>
        </div>
        <MRRChart data={chartData} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-black/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="mono text-[10px] uppercase tracking-widest text-black/40">
                Pipeline
              </div>
              <h2 className="text-2xl font-heading font-extrabold mt-1">
                Active & warm
              </h2>
            </div>
          </div>
          {pipelineContacts.length === 0 ? (
            <p className="mono text-xs text-black/40 uppercase tracking-widest">
              No contacts yet
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {pipelineContacts.slice(0, 6).map((c) => (
                <li
                  key={c.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{c.name ?? "—"}</div>
                    <div className="mono text-[10px] uppercase tracking-widest text-black/40">
                      {c.company ?? ""} · {c.status ?? "idea"}
                    </div>
                  </div>
                  <div className="mono text-sm">
                    {currency(Number(c.monthly_value ?? 0))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-black/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="mono text-[10px] uppercase tracking-widest text-black/40">
                Recent invoices
              </div>
              <h2 className="text-2xl font-heading font-extrabold mt-1">
                Latest activity
              </h2>
            </div>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="mono text-xs text-black/40 uppercase tracking-widest">
              No invoices yet
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {recentInvoices.map((inv) => (
                <li
                  key={inv.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">
                      {inv.client_name ?? "Untitled"}
                    </div>
                    <div className="mono text-[10px] uppercase tracking-widest text-black/40">
                      {inv.number ?? "—"} · {inv.status ?? "draft"} ·{" "}
                      {inv.date ?? ""}
                    </div>
                  </div>
                  <div className="mono text-sm">
                    {currency(invoiceTotal(inv))}
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

function StatCard({
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
    <div
      className={`border p-6 ${
        accent
          ? "border-accent bg-accent/10"
          : "border-black/10 hover:border-black/30 transition"
      }`}
    >
      <div className="mono text-[10px] uppercase tracking-widest text-black/40 mb-3">
        {label}
      </div>
      <div className="text-3xl font-heading font-extrabold tracking-tight">
        {value}
      </div>
      {hint && (
        <div className="mono text-[10px] uppercase tracking-widest text-black/40 mt-2">
          {hint}
        </div>
      )}
    </div>
  );
}
