-- =============================================================================
-- Add client_id foreign keys
-- =============================================================================
--
-- Step 1 of the client-FK migration. Adds nullable client_id columns to
-- proposals, agreements, invoices, and opportunities, all referencing
-- public.clients(id) with on-delete-restrict (we never want to silently
-- drop client linkage if a client row is deleted by mistake).
--
-- Backfill happens in step 2 (data migration). NOT NULL constraints on
-- agreements.client_id and invoices.client_id are added in step 3 once
-- backfill is verified.
--
-- proposals.client_id and opportunities.client_id stay nullable
-- permanently — proposals can exist for prospects with no client yet,
-- and opportunities precede client creation in the funnel.
-- =============================================================================

alter table public.proposals
  add column if not exists client_id uuid
    references public.clients(id) on delete restrict;
create index if not exists proposals_client_id_idx
  on public.proposals(client_id);

alter table public.agreements
  add column if not exists client_id uuid
    references public.clients(id) on delete restrict;
create index if not exists agreements_client_id_idx
  on public.agreements(client_id);

alter table public.invoices
  add column if not exists client_id uuid
    references public.clients(id) on delete restrict;
create index if not exists invoices_client_id_idx
  on public.invoices(client_id);

alter table public.opportunities
  add column if not exists client_id uuid
    references public.clients(id) on delete restrict;
create index if not exists opportunities_client_id_idx
  on public.opportunities(client_id);
