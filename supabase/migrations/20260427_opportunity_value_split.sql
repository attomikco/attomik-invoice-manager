-- Split opportunities.estimated_value into Phase 1 (one-time) and Phase 2 (monthly retainer)
-- so Pipeline KPIs can report MRR and one-time revenue separately.
-- Legacy estimated_value column is intentionally retained as a safety net.

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS estimated_phase1_value numeric(12,2) DEFAULT 8000,
  ADD COLUMN IF NOT EXISTS estimated_phase2_monthly numeric(12,2) DEFAULT 5000;

-- Backfill the 4 prospect-stage opportunities to (10000, 5000).
-- The 14 historical won opportunities (and Xochi at qualified) inherit the (8000, 5000)
-- column defaults applied during ADD COLUMN.
UPDATE opportunities
SET estimated_phase1_value = 10000,
    estimated_phase2_monthly = 5000
WHERE company_name IN ('Reset Wellness', 'Vista Energy', 'Military Energy Gum', 'Giffard');
