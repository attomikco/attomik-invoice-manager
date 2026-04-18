/**
 * Insert a fixed list of proposals into Supabase.
 *
 * Usage:
 *   npx ts-node scripts/migrate-proposals.ts
 */

import { config as loadEnv } from "dotenv";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const proposals = [
  {
    number: "#PROP001",
    date: "2026-03-24",
    valid_until: "2026-04-23",
    status: "accepted",
    client_name: "Buzzy Sklar",
    client_email: "buzzy@kintsugisake.com",
    client_company: "Oishii",
    intro:
      "Thank you for the opportunity. We're excited to share this proposal for your review. Please don't hesitate to reach out with any questions.",
    items: [],
    discount: 0,
    notes: "",
    phase1_title: "DTC Strategy + Shopify Build",
    phase1_price: "8000",
    phase1_timeline: "20 – 45 days",
    phase1_payment: "$5k to start · $3k on launch",
    phase2_title: "Growth + Ads Bundle",
    phase2_monthly: "$4,000 / mo",
    phase2_commitment: "3",
  },
  {
    number: "#PROP002",
    date: "2026-03-24",
    valid_until: "2026-04-23",
    status: "declined",
    client_name: "Dulce Bingham",
    client_email: "dbingham@backbarproject.com",
    client_company: "Giffard",
    intro:
      "Built in two phases. You only commit to Phase 1 — Phase 2 starts after launch and runs month-by-month with no commitment, so you can cancel after Phase 1 or stop anytime once it's running.",
    items: [],
    discount: 0,
    notes: "",
    phase1_title: "DTC Strategy + Shopify Build",
    phase1_price: "8000",
    phase1_timeline: "20 – 45 days",
    phase1_payment: "$5k to start · $3k on launch",
    phase2_title: "Growth + Ads Bundle",
    phase2_monthly: "$4,000 / mo",
    phase2_commitment: "3",
  },
  {
    number: "#PROP003",
    date: "2026-04-08",
    valid_until: "2026-05-08",
    status: "sent",
    client_name: "Osia",
    client_email: "",
    client_company: "",
    intro:
      "Built in two phases. You only commit to Phase 1 — Phase 2 starts after launch and runs month-by-month with no commitment, so you can cancel after Phase 1 or stop anytime once it's running.",
    items: [],
    discount: 0,
    notes: "",
    phase1_title: "DTC Strategy + Shopify Build",
    phase1_price: "8000",
    phase1_timeline: "20 – 45 days",
    phase1_payment: "$5k to start · $3k on launch",
    phase2_title: "Growth + Ads Bundle",
    phase2_monthly: "4000",
    phase2_commitment: "3",
  },
  {
    number: "#PROP004",
    date: "2026-04-10",
    valid_until: "2026-05-10",
    status: "sent",
    client_name: "Reset Wellness",
    client_email: "",
    client_company: "",
    intro:
      "Built in two phases. You only commit to Phase 1 — Phase 2 starts after launch and runs month-by-month with no commitment, so you can cancel after Phase 1 or stop anytime once it's running.",
    items: [],
    discount: 0,
    notes: "",
    phase1_title: "DTC Strategy + Shopify Build",
    phase1_price: "8000",
    phase1_timeline: "20 – 45 days",
    phase1_payment: "$5k to start · $3k on launch",
    phase2_title: "Growth + Ads Bundle",
    phase2_monthly: "4000",
    phase2_commitment: "3",
  },
  {
    number: "#PROP005",
    date: "2026-04-13",
    valid_until: "2026-05-13",
    status: "sent",
    client_name: "Logan",
    client_email: "",
    client_company: "",
    intro:
      "Built in two phases. You only commit to Phase 1 — Phase 2 starts after launch and runs month-by-month with no commitment, so you can cancel after Phase 1 or stop anytime once it's running.",
    items: [],
    discount: 0,
    notes: "",
    phase1_title: "DTC Strategy + Shopify Build",
    phase1_price: "5000",
    phase1_timeline: "20 – 45 days",
    phase1_payment: "$5k to start work",
    phase2_title: "Growth + Ads Bundle",
    phase2_monthly: "$4,000 / mo",
    phase2_commitment: "3",
  },
  {
    number: "#PROP006",
    date: "2026-04-17",
    valid_until: "2026-05-17",
    status: "draft",
    client_name: "Rei Rocha",
    client_email: "rei@chaserwater.com",
    client_company: "Chaser Water",
    intro:
      "Built in two phases. You only commit to Phase 1 — Phase 2 starts after launch and runs month-by-month with no commitment, so you can cancel after Phase 1 or stop anytime once it's running.",
    items: [],
    discount: 0,
    notes: "",
    phase1_title: "DTC Strategy + Shopify Build",
    phase1_price: "8000",
    phase1_timeline: "20 – 45 days",
    phase1_payment: "$5k to start · $3k on launch",
    phase2_title: "Growth + Ads Bundle",
    phase2_monthly: "$5,000 / mo",
    phase2_commitment: "3",
  },
  {
    number: "#PROP007",
    date: "2026-04-17",
    valid_until: "2026-05-17",
    status: "draft",
    client_name: "Military Energy Gum",
    client_email: "",
    client_company: "",
    intro:
      "Built in two phases. You only commit to Phase 1 — Phase 2 starts after launch and runs month-by-month with no commitment, so you can cancel after Phase 1 or stop anytime once it's running.",
    items: [],
    discount: 0,
    notes: "",
    phase1_title: "DTC Strategy + Shopify Build",
    phase1_price: "8000",
    phase1_timeline: "20 – 45 days",
    phase1_payment: "$5k to start · $3k on launch",
    phase2_title: "Growth + Ads Bundle",
    phase2_monthly: "$4,000 / mo",
    phase2_commitment: "3",
  },
];

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
      "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
    process.exit(1);
  }

  console.log("Attomik HQ · Proposals seed");
  console.log(`  target: ${SUPABASE_URL}`);
  console.log(
    `  auth:   ${
      process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "service_role"
        : "anon (RLS must be disabled)"
    }`,
  );
  console.log(`  rows:   ${proposals.length}`);

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb
    .from("proposals")
    .insert(proposals)
    .select("id, number");

  if (error) {
    console.error(`\n✗ insert failed: ${error.message}`);
    process.exit(1);
  }

  console.log(`\n✓ inserted ${data?.length ?? 0} proposal(s)`);
  for (const row of data ?? []) {
    console.log(`  ${row.number} → ${row.id}`);
  }
}

main().catch((e) => {
  console.error("\nFATAL:", e);
  process.exit(1);
});
