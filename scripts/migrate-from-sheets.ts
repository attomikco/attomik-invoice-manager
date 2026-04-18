/**
 * Migrate data from Google Sheets (via Apps Script endpoint) into Supabase.
 *
 * Apps Script API (discovered in backup/index.html:731-757):
 *   GET <url>?action=getAll       → { invoices, clients, services }
 *   GET <url>?action=getSettings  → { settings: { key: value, ... } }
 *
 * Usage:
 *   npx ts-node scripts/migrate-from-sheets.ts
 *
 * Flags:
 *   --fresh          DELETE all rows in target tables before inserting
 *   --only=<name>    Migrate only one resource (services | clients | invoices | settings)
 *   --dry            Fetch + map, but do not write to Supabase
 *
 * Credentials (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY      (preferred — bypasses RLS)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  (fallback — works only if RLS is disabled)
 */

import { config as loadEnv } from "dotenv";
import * as path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyXosTsKECTFo3j816TyPSccl829nHAczUBfoZm3dbMDpWSOlzmi-P7spJSHpiLm6m2/exec";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const args = new Set(process.argv.slice(2));
const FRESH = args.has("--fresh");
const DRY = args.has("--dry");
const ONLY_ARG = process.argv
  .slice(2)
  .find((a) => a.startsWith("--only="))
  ?.split("=")[1]
  ?.toLowerCase();

type Row = Record<string, unknown>;

// ── logging helpers ──────────────────────────────────────────────────

const logStep = (m: string) => console.log(`\n▸ ${m}`);
const logInfo = (m: string) => console.log(`  ${m}`);
const logOk = (m: string) => console.log(`  ✓ ${m}`);
const logWarn = (m: string) => console.warn(`  ! ${m}`);
const logErr = (m: string) => console.error(`  ✗ ${m}`);

// ── value helpers ────────────────────────────────────────────────────

function pickRaw(row: Row, keys: string[]): unknown {
  const wanted = keys.map((k) => k.toLowerCase());
  for (const rowKey of Object.keys(row)) {
    if (wanted.includes(rowKey.toLowerCase())) {
      const v = row[rowKey];
      if (v !== undefined && v !== null && v !== "") return v;
    }
  }
  return null;
}

function str(row: Row, keys: string[], fallback = ""): string {
  const v = pickRaw(row, keys);
  return v == null ? fallback : String(v).trim();
}

function num(row: Row, keys: string[], fallback = 0): number {
  const v = pickRaw(row, keys);
  if (v == null) return fallback;
  if (typeof v === "number" && !isNaN(v)) return v;
  const cleaned = String(v).replace(/[$,\s%]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? fallback : n;
}

function dateISO(row: Row, keys: string[]): string | null {
  const v = pickRaw(row, keys);
  if (v == null) return null;
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function toArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        /* fall through */
      }
    }
    return trimmed
      .split(/[,;\n]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

// ── mappers ──────────────────────────────────────────────────────────

function mapService(row: Row) {
  return {
    name: str(row, ["name", "title"]),
    // backup/index.html DEFAULT_SERVICES uses `desc`, not `description`
    description:
      str(row, ["description", "desc", "details", "notes"]) || null,
    price: num(row, ["price", "rate", "amount"]),
  };
}

type LineItem = {
  service_id: string | null;
  title: string | null;
  description: string | null;
  qty: number;
  rate: number;
};

function normalizeLineItem(raw: unknown): LineItem {
  const r = (raw ?? {}) as Row;
  return {
    service_id:
      (pickRaw(r, ["service_id", "serviceId", "service"]) as string) || null,
    title: (pickRaw(r, ["title", "name", "description"]) as string) || null,
    description: (pickRaw(r, ["description", "details"]) as string) || null,
    qty: Number(pickRaw(r, ["qty", "quantity"]) ?? 1) || 0,
    rate: Number(pickRaw(r, ["rate", "price", "unit_price", "unitPrice"]) ?? 0) || 0,
  };
}

function mapClient(row: Row) {
  const primaryEmail = str(row, ["email", "primary email", "primary_email"]);
  const extraRaw = pickRaw(row, [
    "emails",
    "additional emails",
    "additional_emails",
    "cc",
  ]);
  const emails = toArray(extraRaw)
    .map((x) => String(x).trim())
    .filter(Boolean)
    .filter((e) => e !== primaryEmail);
  return {
    name: str(row, ["name", "client", "client name", "client_name", "contact"]),
    email: primaryEmail || null,
    emails,
    company: str(row, ["company", "business", "organization"]) || null,
    address: str(row, ["address", "billing address"]) || null,
    payment_terms:
      str(row, ["payment terms", "payment_terms", "terms"]) || null,
  };
}

function mapInvoice(row: Row) {
  const itemsRaw = pickRaw(row, [
    "items",
    "line items",
    "line_items",
    "lines",
  ]);
  const items = toArray(itemsRaw).map(normalizeLineItem);
  return {
    number:
      str(row, ["number", "invoice number", "invoice_number", "invoiceNumber", "id"]) ||
      null,
    date: dateISO(row, ["date", "issue date", "issued", "created"]),
    due: dateISO(row, ["due", "due date", "due_date", "dueDate"]),
    status: (str(row, ["status"]) || "draft").toLowerCase(),
    client_name:
      str(row, ["client", "client name", "client_name", "clientName"]) || null,
    client_email:
      str(row, ["client email", "client_email", "clientEmail", "email"]) ||
      null,
    client_company:
      str(row, ["client company", "client_company", "clientCompany", "company"]) ||
      null,
    client_address:
      str(row, ["client address", "client_address", "clientAddress", "address"]) ||
      null,
    items,
    discount: num(row, ["discount", "discount %", "discount_pct", "discountPct"]),
    notes: str(row, ["notes", "memo"]) || null,
  };
}

// Rename sheet-side setting keys to the keys the app reads (see app/(app)/settings/page.tsx).
// Keys not listed here pass through unchanged.
const SETTINGS_KEY_RENAME: Record<string, string> = {
  name: "legal_name",
  brandName: "brand_name",
  terms: "default_payment_terms",
  paymentInstructions: "payment_instructions",
};

const CURRENCY_SYMBOL_TO_CODE: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
};

function normalizeSettingValue(key: string, raw: unknown): string {
  const value = typeof raw === "string" ? raw : JSON.stringify(raw);
  if (key === "currency") {
    const trimmed = value.trim();
    return CURRENCY_SYMBOL_TO_CODE[trimmed] ?? trimmed;
  }
  return value;
}

function settingsMapToRows(
  map: Record<string, unknown>,
): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  for (const [sourceKey, raw] of Object.entries(map)) {
    if (raw == null) continue;
    const key = SETTINGS_KEY_RENAME[sourceKey] ?? sourceKey;
    const value = normalizeSettingValue(key, raw);
    if (value === "") continue;
    out.push({ key, value });
  }
  return out;
}

// ── fetch ────────────────────────────────────────────────────────────

function extractJson(text: string): unknown {
  // Apps Script responses may be wrapped. Take first { to last } and parse.
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) {
    throw new Error(
      `No JSON object in response (first 200 chars): ${text.slice(0, 200)}`,
    );
  }
  const slice = text.slice(first, last + 1);
  try {
    return JSON.parse(slice);
  } catch (e) {
    throw new Error(
      `JSON parse failed: ${(e as Error).message}. Slice: ${slice.slice(0, 200)}`,
    );
  }
}

async function callAction(action: string): Promise<unknown> {
  const url = `${SCRIPT_URL}?action=${encodeURIComponent(action)}`;
  logInfo(`GET ${url}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const text = await res.text();
  const data = extractJson(text) as Record<string, unknown>;
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(`Apps Script error: ${String(data.error)}`);
  }
  return data;
}

type GetAllResponse = {
  invoices?: Row[];
  clients?: Row[];
  services?: Row[];
};

type GetSettingsResponse = {
  settings?: Record<string, unknown>;
};

// ── run ──────────────────────────────────────────────────────────────

async function wipe(sb: SupabaseClient, table: string) {
  logWarn(`--fresh: deleting all rows from ${table}`);
  const { error } = await sb
    .from(table)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
      "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
    process.exit(1);
  }

  console.log("Attomik HQ · Sheets → Supabase migration");
  console.log(`  target: ${SUPABASE_URL}`);
  console.log(
    `  auth:   ${
      process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "service_role"
        : "anon (RLS must be disabled)"
    }`,
  );
  console.log(
    `  mode:   ${DRY ? "DRY RUN" : FRESH ? "FRESH (wipe + insert)" : "APPEND"}`,
  );
  if (ONLY_ARG) console.log(`  only:   ${ONLY_ARG}`);

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Step 1: fetch getAll (invoices + clients + services) ─────────
  let getAll: GetAllResponse = {};
  logStep("Fetching getAll");
  try {
    getAll = (await callAction("getAll")) as GetAllResponse;
    logInfo(
      `received: invoices=${getAll.invoices?.length ?? 0}, ` +
        `clients=${getAll.clients?.length ?? 0}, ` +
        `services=${getAll.services?.length ?? 0}`,
    );
  } catch (e) {
    logErr((e as Error).message);
    process.exit(1);
  }

  // ── Step 2: fetch getSettings ────────────────────────────────────
  let getSettings: GetSettingsResponse = {};
  logStep("Fetching getSettings");
  try {
    getSettings = (await callAction("getSettings")) as GetSettingsResponse;
    const keys = Object.keys(getSettings.settings ?? {});
    logInfo(`received ${keys.length} setting key(s): ${keys.join(", ") || "(none)"}`);
  } catch (e) {
    logErr((e as Error).message);
    process.exit(1);
  }

  // ── Step 3: migrate each resource ────────────────────────────────
  const results = { ok: 0, fail: 0, skipped: 0 };

  async function runStep(name: string, fn: () => Promise<void>) {
    if (ONLY_ARG && name.toLowerCase() !== ONLY_ARG) {
      results.skipped++;
      return;
    }
    logStep(`Migrate ${name}`);
    try {
      await fn();
      results.ok++;
    } catch (e) {
      logErr((e as Error).message);
      results.fail++;
    }
  }

  await runStep("services", async () => {
    const rows = getAll.services ?? [];
    if (rows.length === 0) return logWarn("no services in source");
    const mapped = rows.map(mapService).filter((s) => s.name);
    logInfo(`mapped ${mapped.length} service(s)`);
    if (DRY) {
      console.log("  (dry) sample:", mapped[0]);
      return;
    }
    if (FRESH) await wipe(sb, "services");
    const { error } = await sb.from("services").insert(mapped);
    if (error) throw error;
    logOk(`inserted ${mapped.length} rows into services`);
  });

  await runStep("clients", async () => {
    const rows = getAll.clients ?? [];
    if (rows.length === 0) return logWarn("no clients in source");
    const mapped = rows.map(mapClient).filter((c) => c.name);
    logInfo(`mapped ${mapped.length} client(s)`);
    if (DRY) {
      console.log("  (dry) sample:", mapped[0]);
      return;
    }
    if (FRESH) await wipe(sb, "clients");
    const { error } = await sb.from("clients").insert(mapped);
    if (error) throw error;
    logOk(`inserted ${mapped.length} rows into clients`);
  });

  await runStep("invoices", async () => {
    const rows = getAll.invoices ?? [];
    if (rows.length === 0) return logWarn("no invoices in source");
    const mapped = rows.map(mapInvoice);
    logInfo(`mapped ${mapped.length} invoice(s)`);
    if (DRY) {
      console.log("  (dry) sample:", mapped[0]);
      return;
    }
    if (FRESH) await wipe(sb, "invoices");
    const { error } = await sb.from("invoices").insert(mapped);
    if (error) throw error;
    logOk(`inserted ${mapped.length} rows into invoices`);
  });

  await runStep("settings", async () => {
    const map = getSettings.settings ?? {};
    const mapped = settingsMapToRows(map);
    if (mapped.length === 0) return logWarn("no settings in source");
    logInfo(`mapped ${mapped.length} setting(s)`);
    if (DRY) {
      console.log("  (dry) settings:", mapped);
      return;
    }
    const { error } = await sb
      .from("settings")
      .upsert(mapped, { onConflict: "key" });
    if (error) throw error;
    logOk(`upserted ${mapped.length} rows into settings`);
  });

  console.log(
    `\nDone. ok=${results.ok} fail=${results.fail} skipped=${results.skipped}`,
  );
  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("\nFATAL:", e);
  process.exit(1);
});
