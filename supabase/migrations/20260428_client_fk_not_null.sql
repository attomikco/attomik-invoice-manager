-- =============================================================================
-- Lock down client_id where every row is now populated
-- =============================================================================
--
-- Step 3 of the client-FK migration. After the step-2 backfill, every row in
-- agreements and invoices has client_id set, so we can promote those columns
-- to NOT NULL — they're now required from this point forward.
--
-- Left nullable on purpose:
--   proposals.client_id      — open prospect-stage proposals (4 today, more
--                              going forward) exist before a client row does.
--                              The funnel is opportunity → proposal → client,
--                              so the client_id only fills in when the deal
--                              wins and a client row is created.
--   opportunities.client_id  — opportunities are leads that haven't become
--                              clients yet; same reason.
-- =============================================================================

alter table public.agreements
  alter column client_id set not null;

alter table public.invoices
  alter column client_id set not null;
