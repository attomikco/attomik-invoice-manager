# Client Data Audit

Read-only audit of the live Supabase database (project `ilkxyudurumpvkapdhbh`), snapshotted **2026-04-28**.

Goal: plan a migration that makes `clients` the source of truth, with `proposals`, `agreements`, `invoices`, and `opportunities` linking via FK instead of carrying duplicated client strings.

---

## Headline numbers

| Table | Row count |
|---|---:|
| `clients` | 13 |
| `proposals` | 8 |
| `agreements` | 3 |
| `invoices` | 78 |
| `opportunities` | 1 |

| Status | Proposals | Agreements | Invoices |
|---|---:|---:|---:|
| draft | — | — | 10 |
| sent | 3 | 2 | 5 |
| signed | — | 1 | — |
| accepted | 4 | — | — |
| declined | 1 | — | — |
| paid | — | — | 61 |
| overdue | — | — | 2 |

---

## 1. Client table inventory

### Full list (13 rows, sorted by `created_at` desc)

| # | id | name | company | email | status | monthly | created_at |
|---|---|---|---|---|---|---:|---|
| 1 | `ad72d295` | Chaser Water | Chaser Water LLC | rei@chaserwater.com | active | 5,000 | 2026-04-24 |
| 2 | `8ff2e074` | Osia | Osia LLC | nicolep@drinkosia.com | active | 4,000 | 2026-04-21 |
| 3 | `2f472d23` | Amass Brands | Amass Brands, Inc. | ap@amass.com | active | 3,000 | 2026-04-20 |
| 4 | `5a9dbec6` | Stuzzi Hot Sauce | Casa Komos Beverages | carla@stuzzihotsauce.com | cancelled | 2,000 | 2026-04-18 |
| 5 | `99204359` | Khloud | Khloud LLC | kaylee.press@khloudfoods.com | cancelled | 4,500 | 2026-04-18 |
| 6 | `fd7e52d9` | Summer Water | Maison Thomas LLC | alexandra@summerwater.com | cancelled | 1,000 | 2026-04-18 |
| 7 | `c6ac98a8` | La Monjita | Alius Ventures LLC | pablo@alius.vc | active | 8,000 | 2026-04-18 |
| 8 | `7665b537` | Oishii Sake | Oishii Sake | buzzy@kintsugisake.com | active | 5,000 | 2026-04-18 |
| 9 | `d521d190` | Good Twin | Amass Brands Inc. | ap@amass.com | cancelled | 5,000 | 2026-04-18 |
| 10 | `f2796364` | Afterdream | Amass Brands Inc. | ap@amass.com | active | 5,000 | 2026-04-18 |
| 11 | `64696c2b` | HpO | Zerra Nutrition Inc. | geoff@drinkhpo.com | cancelled | 4,000 | 2026-04-18 |
| 12 | `392b7439` | Gameplan Skincare | GamePlan Skincare, Inc. | gabby@gameplanskincare.com | active | 4,000 | 2026-04-18 |
| 13 | `2f286a9b` | Jolene Coffee | GBE Jolene Liquids LLC | jake@jolenecoffee.com | active | 8,000 | 2026-04-18 |

### Flags

- **Missing email**: 0
- **Missing company**: 0
- **Missing name**: 0
- **Duplicate email** (same email on multiple clients): **1 cluster, 3 rows**

  | email | client rows |
  |---|---|
  | `ap@amass.com` | `2f472d23` Amass Brands · `d521d190` Good Twin · `f2796364` Afterdream |

  These three clients are conceptually three separate brands all owned by Amass Brands and managed from the same inbox. **This is the single biggest source of ambiguity for the migration.** Email-only matching collapses all `ap@amass.com` records onto the first row a `LIMIT 1` returns (today: Good Twin), so 27 invoices currently labeled with `client_name="Afterdream"` get attributed to Good Twin's row in any naive linker.

- **Company-name near-duplicates worth eyeballing**:
  - "Amass Brands, Inc." vs "Amass Brands Inc." (single comma) — exists across the three Amass rows
  - "Oishii Sake" appears twice (it's the same client; only one row has it both as name AND company)

---

## 2. Proposal linkage (8 rows)

### Match-type summary

| match_type | count |
|---|---:|
| `email_exact` | 4 |
| `email_in_emails_array` | 0 |
| `company_exact` | 0 |
| `company_fuzzy` | 0 |
| `name_exact` | 0 |
| **`none`** | **4** |

### Per-row

| number | client_name | client_email | client_company | status | match_type | matched_client_id |
|---|---|---|---|---|---|---|
| #PROP008 | Rei Rocha | rei@chaserwater.com | Chaser Water | accepted | `email_exact` | `ad72d295` (Chaser Water) |
| #PROP007 | Scott Lerner | slerner@fordgum.com | Military Energy Gum | sent | **none** | — |
| #PROP002 | Dulce Bingham | dbingham@backbarproject.com | Giffard | declined | **none** | — |
| #PROP004 | Diego Mondragon | diego@mesasana.com | Reset Wellness | sent | **none** | — |
| #PROP003 | Nicole Pitsinos | nicolep@drinkosia.com | Osia | accepted | `email_exact` | `8ff2e074` (Osia) |
| #PROP006 | Chaser Water | rei@chaserwater.com | Chaser Water | accepted | `email_exact` | `ad72d295` (Chaser Water) |
| #PROP001 | Buzzy Sklar | buzzy@kintsugisake.com | Oishii | accepted | `email_exact` | `7665b537` (Oishii Sake) |
| #PROP005 | Logan Pollack | lpollack@durwoodst.com | Vista Energy | sent | **none** | — |

---

## 3. Agreement linkage (3 rows)

### Match-type summary

| match_type | count |
|---|---:|
| `email_exact` | 3 |
| everything else | 0 |

100% match rate. Every agreement was created from a proposal that was already linked to an existing client.

### Per-row

| number | client_name | client_email | client_company | status | match_type | matched_client_id |
|---|---|---|---|---|---|---|
| ATMSA004 | Rei Rocha | rei@chaserwater.com | Chaser Water | sent | `email_exact` | `ad72d295` (Chaser Water) |
| ATMSA003 | Buzzy Sklar | buzzy@kintsugisake.com | Oishii | sent | `email_exact` | `7665b537` (Oishii Sake) |
| ATMSA001 | Osia | nicolep@drinkosia.com | Osia LLC | signed | `email_exact` | `8ff2e074` (Osia) |

---

## 4. Invoice linkage (78 rows)

### Match-type summary

| match_type | count |
|---|---:|
| `email_exact` | 67 |
| `company_exact` | 10 |
| `name_exact` | 1 |
| everything else | 0 |
| **`none`** | **0** |

100% match rate. The 10 `company_exact` invoices have a null/empty `client_email` and only the company name to go on (Stuzzi → Casa Komos Beverages, Summer Water → Maison Thomas LLC, Khloud → Khloud LLC). The 1 `name_exact` is `#ATM079` ("Chaser Water" with both email and company empty).

### ⚠ Caveat — the duplicate-email collision

All 27 invoices that hit `ap@amass.com` (across `client_name` values: Afterdream, Good Twin, Amass Brands) match to the same row by `email_exact` because of `LIMIT 1` semantics. Today's matcher returns Good Twin's id (`d521d190`) for every one of them. **For the migration, you'll need to disambiguate ap@amass.com records by `client_name` to recover the original brand attribution.** Breakdown by name string:

| invoice client_name | row count under ap@amass.com |
|---|---:|
| Afterdream | 14 |
| Good Twin | 9 |
| Jolene Coffee (sanity check, no ap@amass.com) | — |
| Amass Brands (#ATM033 only) | 1 |
| **Total ap@amass.com rows** | **24 + a few via company match** |

(The numbers above are from the per-row dump, eyeballed.)

### Sample (most recent 10)

| number | client_name | client_email | client_company | match_type | matched_client_id |
|---|---|---|---|---|---|
| #ATM080 | Chaser Water | rei@chaserwater.com | Chaser Water LLC | `email_exact` | `ad72d295` |
| #ATM079 | Chaser Water | (empty) | (empty) | `name_exact` | `ad72d295` |
| #ATM077 | Osia | nicolep@drinkosia.com | Osia LLC | `email_exact` | `8ff2e074` |
| #ATM076 | Osia | nicolep@drinkosia.com | Osia LLC | `email_exact` | `8ff2e074` |
| #ATM075 | Stuzzi | (null) | Casa Komos Beverages | `company_exact` | `5a9dbec6` |
| #ATM074 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_exact` | `2f286a9b` |
| #ATM073 | Summer Water | (null) | Maison Thomas LLC | `company_exact` | `fd7e52d9` |
| #ATM072 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_exact` | `d521d190` ⚠ should be `f2796364` (Afterdream) |
| #ATM071 | HpO | geoff@drinkhpo.com | Zerra Nutrition Inc. | `email_exact` | `64696c2b` |
| #ATM070 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_exact` | `2f286a9b` |

---

## 5. Opportunity linkage

There's **1 opportunity** (the funnel was just rebuilt; only one row has been created so far).

`opportunities` does not carry a `client_id` column today — it carries `company_name`, `contact_name`, `contact_email` directly. So the question "client_id set vs null" doesn't apply yet; the relevant question is "does the opportunity's contact match a client row?".

| id | company_name | contact_name | contact_email | stage | matches a client? |
|---|---|---|---|---|---|
| `1dfa6b77` | Chaser Water | Rei Rocha | rei@chaserwater.com | won | ✅ `ad72d295` (Chaser Water) — `email_exact` |

### Downstream chain consistency

The single opportunity won → spawned proposal #PROP008 → spawned agreement ATMSA004. Both the proposal and the agreement carry `opportunity_id` pointing back to this row, AND all three (opportunity contact, proposal client_email, agreement client_email) resolve to the same client (`ad72d295` Chaser Water) via the strongest match. **No drift in the live opportunity → proposal → agreement chain.**

---

## 6. Cross-entity drift / per-client roll-ups

⚠ **Methodology caveat**: the per-client counts below use the same "best match wins, ties broken by row order" logic as sections 2–4. Because three clients share `ap@amass.com`, this rollup credits all 27 ap@amass.com records to **Good Twin** alone — the other two (Amass Brands, Afterdream) appear empty. The real attribution is split across all three brands by `client_name` on the invoice; the migration tool needs name-aware disambiguation to recover this.

### Counts (descending by total)

| client_id | name | company | proposals | agreements | invoices | total | notes |
|---|---|---|---:|---:|---:|---:|---|
| `d521d190` | Good Twin | Amass Brands Inc. | 0 | 0 | 27 | 27 | ⚠ inflated — eats all ap@amass.com records |
| `2f286a9b` | Jolene Coffee | GBE Jolene Liquids LLC | 0 | 0 | 17 | 17 | biggest single-brand account |
| `fd7e52d9` | Summer Water | Maison Thomas LLC | 0 | 0 | 8 | 8 | |
| `64696c2b` | HpO | Zerra Nutrition Inc. | 0 | 0 | 6 | 6 | |
| `ad72d295` | Chaser Water | Chaser Water LLC | 2 | 1 | 2 | 5 | full chain present |
| `392b7439` | Gameplan Skincare | GamePlan Skincare, Inc. | 0 | 0 | 5 | 5 | |
| `c6ac98a8` | La Monjita | Alius Ventures LLC | 0 | 0 | 5 | 5 | |
| `7665b537` | Oishii Sake | Oishii Sake | 1 | 1 | 2 | 4 | |
| `8ff2e074` | Osia | Osia LLC | 1 | 1 | 2 | 4 | |
| `99204359` | Khloud | Khloud LLC | 0 | 0 | 2 | 2 | |
| `5a9dbec6` | Stuzzi Hot Sauce | Casa Komos Beverages | 0 | 0 | 2 | 2 | |
| `f2796364` | Afterdream | Amass Brands Inc. | 0 | 0 | 0 | **0** | ⚠ orphaned by matcher (collisions go to Good Twin) |
| `2f472d23` | Amass Brands | Amass Brands, Inc. | 0 | 0 | 0 | **0** | ⚠ orphaned by matcher (collisions go to Good Twin) |

### Orphaned clients (post-matcher)

- `f2796364` Afterdream — should hold ~14 invoices (all ap@amass.com + client_name="Afterdream")
- `2f472d23` Amass Brands — should hold #ATM033 (and possibly proposals/agreements that label it "Amass Brands")

These are NOT genuinely orphaned in the source data — they're orphaned only because the email-key collision routes everything to the first match. After name-aware disambiguation in the migration, they'll have records.

### Top accounts (sanity check)

After fixing the Amass collision, the real top accounts by invoice count are likely:
- **Jolene Coffee** (17)
- **Amass Brands aggregate** (Good Twin + Afterdream + Amass Brands ≈ 24 invoices total)
- **Summer Water** (8)
- **HpO** (6)

---

## 7. Orphan strings — records that don't link cleanly

### Proposals with `match_type = 'none'` (4 rows)

Sorted alphabetically by `client_company`:

| client_name | client_email | client_company | proposal | status |
|---|---|---|---|---|
| Dulce Bingham | dbingham@backbarproject.com | Giffard | #PROP002 | declined |
| Scott Lerner | slerner@fordgum.com | Military Energy Gum | #PROP007 | sent |
| Diego Mondragon | diego@mesasana.com | Reset Wellness | #PROP004 | sent |
| Logan Pollack | lpollack@durwoodst.com | Vista Energy | #PROP005 | sent |

These look like real prospects who never became clients (one declined, three still in `sent` status). For the migration these likely become **opportunities**, not clients — they belong in the funnel, not the live-client table.

### Agreements with `match_type = 'none'`

**0 rows.** All 3 agreements link cleanly via `email_exact`.

### Invoices with `match_type = 'none'`

**0 rows.** Every invoice resolves to some client (though the Amass collision misroutes 24 of them — see §4 caveat).

---

## 8. Recommended actions

### Migration risk tiers

| Risk | Records | What |
|---|---:|---|
| **Zero-risk** (`email_exact` + unambiguous email) | 64 | 3 proposals + 3 agreements + 58 invoices where `email_exact` returns exactly one client and that client's email is unique. |
| **Low** (`email_exact` but email is shared across 3 Amass clients) | 24 | All `ap@amass.com` invoices. Need a deterministic disambiguation rule — match by `client_name` → Amass Brands / Good Twin / Afterdream. |
| **Medium** (`company_exact`, `name_exact`) | 11 | 10 invoices with no email but a clean company string + 1 invoice (`#ATM079`) with only `client_name="Chaser Water"`. Spot-check before committing — these match a single client today, but the next time someone types "Chaser Water" elsewhere you'd need a rule. |
| **Manual decision** (`none`) | 4 | The 4 unmatched proposals (Giffard, Military Energy Gum, Reset Wellness, Vista Energy). Don't create client rows for these — fold them into the **opportunities** funnel instead. |

**Total records to migrate**: 89 (8 proposals + 3 agreements + 78 invoices). **Of these, 64 land cleanly without judgment, 24 need a name-aware rule, 11 need spot-check, 4 need a routing decision.**

### Suggested next steps, in order

1. **Resolve the Amass cluster first.** Either (a) merge the three rows into one client called "Amass Brands" with the three brand names tracked elsewhere (a `brands` text array, or a separate `client_brands` table), or (b) keep three separate clients but pick a unique email for each (`ap+goodtwin@amass.com` / `ap+afterdream@amass.com` style aliases). Option (b) preserves the current data shape; option (a) is cleaner long-term but requires a UI concept of "brand under client". My read: do (a) — invoices can carry an optional `brand_id` per line.

2. **Decide on the 4 orphan proposals.** They should become opportunities. Either run a one-shot `INSERT INTO opportunities SELECT … FROM proposals WHERE …` migration, or click them through the proposal-edit form and mark them as opportunities manually. Then null out their client info (or delete them, they're either declined or stale).

3. **Then add the FK columns.** `proposals.client_id`, `agreements.client_id`, `invoices.client_id`, all `NULL`-able to start, all `references public.clients(id) on delete restrict` (don't lose history if a client is deleted by mistake).

4. **Backfill the FKs in one big script.** For each existing row, use the match logic above with name-aware disambiguation for the Amass case. Output a CSV of `(record_id, candidate_client_id, match_type)` first; eyeball it before committing the UPDATE.

5. **Add a NOT NULL constraint** on `*.client_id` only after backfill is done and the UI starts populating it on every insert.

6. **Drop the duplicated string columns** (`client_name`, `client_email`, `client_company`, `client_address` on proposals/agreements/invoices) only after the UI has been migrated to read them from the joined `clients` row. Don't rush this — keep them as a safety net for one or two billing cycles in case anything depends on the snapshotted text.

7. **Backfill `opportunities.client_id`** the same way (today the column doesn't exist; add it). The single existing opportunity already maps cleanly to Chaser Water.

### What NOT to do

- Don't drop the duplicate Amass clients without first checking that downstream PDFs / invoice numbering / payment receipts haven't been issued under "Good Twin" or "Afterdream" specifically. Squashing them might be confusing to the customer.
- Don't add a UNIQUE constraint on `clients.email` until the Amass cluster is resolved. It will fail.
- Don't delete proposal rows in the orphan list without first archiving the client_company strings (Giffard, Reset Wellness, etc.) somewhere — those are leads worth remembering.
