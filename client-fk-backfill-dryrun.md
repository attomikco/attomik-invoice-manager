# Client FK Backfill — Dry Run

Read-only dry run against the live Supabase project (`ilkxyudurumpvkapdhbh`), snapshotted **2026-04-28**.

For every existing proposal, agreement, and invoice, this report shows which `clients.id` it would be linked to under the agreed match priority, the rule that fired, and whether anything needs manual review before the actual UPDATE statements run.

**Important context** since the previous audit:
- The 4 orphan proposals (`#PROP002`/`#PROP004`/`#PROP005`/`#PROP007`) are still orphans here because they were converted to **opportunities**, not to clients. Their opportunity records carry the contact info, but those contacts aren't in `clients` either, so `opportunity_chain` can't resolve them. They stay `none` — see section 5 for what to do.
- Today's `email_collision_resolved_by_name` rule cleanly disambiguates the 27 `ap@amass.com` invoices across the three Amass clients (Good Twin, Afterdream, Amass Brands), correcting the inflated rollup from the previous audit.

---

## Section 1 — Summary

| match_type | proposals | agreements | invoices | total |
|---|---:|---:|---:|---:|
| `email_unique` | 4 | 3 | 51 | 58 |
| `email_collision_resolved_by_name` | 0 | 0 | 27 | 27 |
| `email_collision_unresolved` | 0 | 0 | 0 | 0 |
| `email_in_emails_array` | 0 | 0 | 0 | 0 |
| `company_exact` | 0 | 0 | 9 | 9 |
| `company_fuzzy` | 0 | 0 | 0 | 0 |
| `name_only` | 0 | 0 | 1 | 1 |
| `opportunity_chain` | 0 | 0 | 0 | 0 |
| **`none`** | **4** | **0** | **0** | **4** |
| **Totals** | 8 | 3 | 78 | 89 |

| | proposals | agreements | invoices | total |
|---|---:|---:|---:|---:|
| Will link cleanly | 4 | 3 | 78 | **85** |
| Need manual review | 4 | 0 | 0 | **4** |

**85 of 89 records (95.5%) link cleanly. 4 proposals need manual review** (all unconverted prospects whose opportunities I created in the previous step).

---

## Section 2 — Proposals (8 rows)

| number | client_name | client_email | client_company | opportunity_id | match_type | proposed_client_id | proposed_client_name | notes |
|---|---|---|---|---|---|---|---|---|
| #PROP001 | Buzzy Sklar | buzzy@kintsugisake.com | Oishii | — | `email_unique` | `7665b537` | Oishii Sake | clean |
| #PROP002 | Dulce Bingham | dbingham@backbarproject.com | Giffard | `d7e1a2b9` | **none** | — | — | Lead → opportunity (lost). No client. **Skip in backfill.** |
| #PROP003 | Nicole Pitsinos | nicolep@drinkosia.com | Osia | — | `email_unique` | `8ff2e074` | Osia | clean |
| #PROP004 | Diego Mondragon | diego@mesasana.com | Reset Wellness | `3d89125e` | **none** | — | — | Lead → opportunity (proposal_sent). No client. **Skip in backfill.** |
| #PROP005 | Logan Pollack | lpollack@durwoodst.com | Vista Energy | `ccbbe195` | **none** | — | — | Lead → opportunity (proposal_sent). No client. **Skip in backfill.** |
| #PROP006 | Chaser Water | rei@chaserwater.com | Chaser Water | — | `email_unique` | `ad72d295` | Chaser Water | clean |
| #PROP007 | Scott Lerner | slerner@fordgum.com | Military Energy Gum | `54043729` | **none** | — | — | Lead → opportunity (proposal_sent). No client. **Skip in backfill.** |
| #PROP008 | Rei Rocha | rei@chaserwater.com | Chaser Water | `1dfa6b77` | `email_unique` | `ad72d295` | Chaser Water | clean (also matches via `opportunity_chain` — same client) |

---

## Section 3 — Agreements (3 rows)

| number | client_name | client_email | client_company | opportunity_id | match_type | proposed_client_id | proposed_client_name | notes |
|---|---|---|---|---|---|---|---|---|
| ATMSA001 | Osia | nicolep@drinkosia.com | Osia LLC | — | `email_unique` | `8ff2e074` | Osia | clean (signed) |
| ATMSA003 | Buzzy Sklar | buzzy@kintsugisake.com | Oishii | — | `email_unique` | `7665b537` | Oishii Sake | clean |
| ATMSA004 | Rei Rocha | rei@chaserwater.com | Chaser Water | `1dfa6b77` | `email_unique` | `ad72d295` | Chaser Water | clean |

100% match.

---

## Section 4 — Invoices (78 rows)

🟡 marks the **24 Amass-cluster invoices** disambiguated by `email_collision_resolved_by_name` — spot-check these to confirm the brand attribution looks right.

| number | client_name | client_email | client_company | match_type | proposed_client_id | proposed_client_name |
|---|---|---|---|---|---|---|
| #ATM080 | Chaser Water | rei@chaserwater.com | Chaser Water LLC | `email_unique` | `ad72d295` | Chaser Water |
| #ATM079 | Chaser Water | (empty) | (empty) | `name_only` | `ad72d295` | Chaser Water |
| #ATM077 | Osia | nicolep@drinkosia.com | Osia LLC | `email_unique` | `8ff2e074` | Osia |
| #ATM076 | Osia | nicolep@drinkosia.com | Osia LLC | `email_unique` | `8ff2e074` | Osia |
| #ATM075 | Stuzzi | (null) | Casa Komos Beverages | `company_exact` | `5a9dbec6` | Stuzzi Hot Sauce |
| #ATM074 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| 🟡 #ATM072 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| #ATM073 | Summer Water | (null) | Maison Thomas LLC | `company_exact` | `fd7e52d9` | Summer Water |
| #ATM071 | HpO | geoff@drinkhpo.com | Zerra Nutrition Inc. | `email_unique` | `64696c2b` | HpO |
| #ATM070 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| 🟡 #ATM069 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| #ATM068 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| 🟡 #ATM067 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| #ATM066 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| 🟡 #ATM065 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| #ATM064 | Summer Water | (null) | Maison Thomas LLC | `company_exact` | `fd7e52d9` | Summer Water |
| #ATM063 | Stuzzi | (null) | Casa Komos Beverages | `company_exact` | `5a9dbec6` | Stuzzi Hot Sauce |
| #ATM062 | Khloud | (null) | Khloud LLC | `company_exact` | `99204359` | Khloud |
| #ATM061 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| #ATM060 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| #ATM059 | Khloud | (null) | Khloud LLC | `company_exact` | `99204359` | Khloud |
| 🟡 #ATM058 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| 🟡 #ATM057 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| #ATM056 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| 🟡 #ATM055 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| #ATM054 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| #ATM053 | Summer Water | (null) | Maison Thomas LLC | `company_exact` | `fd7e52d9` | Summer Water |
| #ATM052 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| 🟡 #ATM051 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| #ATM050 | Summer Water | (null) | Maison Thomas LLC | `company_exact` | `fd7e52d9` | Summer Water |
| #ATM049 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| #ATM048 | Summer Water | (null) | Maison Thomas LLC | `company_exact` | `fd7e52d9` | Summer Water |
| #ATM047 | Summer Water | (null) | Maison Thomas LLC | `company_exact` | `fd7e52d9` | Summer Water |
| #ATM046 | Summer Water | (null) | Maison Thomas LLC | `company_exact` | `fd7e52d9` | Summer Water |
| #ATM045 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| 🟡 #ATM044 | Good Twin | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `d521d190` | Good Twin |
| #ATM043 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| #ATM042 | Summer Water | (null) | Maison Thomas LLC | `company_exact` | `fd7e52d9` | Summer Water |
| 🟡 #ATM041 | Good Twin | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `d521d190` | Good Twin |
| 🟡 #ATM040 | Good Twin | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `d521d190` | Good Twin |
| 🟡 #ATM039 | Good Twin | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `d521d190` | Good Twin |
| 🟡 #ATM037 | Oishii Sake | buzzy@kintsugisake.com | Oishii Sake | `email_unique` | `7665b537` | Oishii Sake |
| 🟡 #ATM036 | La Monjita | pablo@alius.vc | Alius Ventures LLC | `email_unique` | `c6ac98a8` | La Monjita |
| 🟡 #ATM035 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| #ATM034 | Oishii Sake | buzzy@kintsugisake.com | Oishii Sake | `email_unique` | `7665b537` | Oishii Sake |
| 🟡 #ATM033 | Amass Brands | ap@amass.com | Amass Brands, Inc. | `email_collision_resolved_by_name` | `2f472d23` | Amass Brands |
| #ATM032 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| #ATM031 | Gameplan Skincare | gabby@gameplanskincare.com | GamePlan Skincare, Inc. | `email_unique` | `392b7439` | Gameplan Skincare |
| 🟡 #ATM030 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| 🟡 #ATM029 | Good Twin | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `d521d190` | Good Twin |
| 🟡 #ATM028 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| #ATM027 | La Monjita | pablo@alius.vc | Alius Ventures LLC | `email_unique` | `c6ac98a8` | La Monjita |
| #ATM026 | Gameplan Skincare | gabby@gameplanskincare.com | GamePlan Skincare, Inc. | `email_unique` | `392b7439` | Gameplan Skincare |
| #ATM025 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| 🟡 #ATM024 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| 🟡 #ATM023 | Good Twin | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `d521d190` | Good Twin |
| #ATM022 | HpO | geoff@drinkhpo.com | Zerra Nutrition Inc. | `email_unique` | `64696c2b` | HpO |
| #ATM021 | La Monjita | pablo@alius.vc | Alius Ventures LLC | `email_unique` | `c6ac98a8` | La Monjita |
| 🟡 #ATM020 | Good Twin | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `d521d190` | Good Twin |
| 🟡 #ATM019 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| #ATM018 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| #ATM017 | Gameplan Skincare | gabby@gameplanskincare.com | GamePlan Skincare, Inc. | `email_unique` | `392b7439` | Gameplan Skincare |
| #ATM016 | Gameplan Skincare | gabby@gameplanskincare.com | GamePlan Skincare, Inc. | `email_unique` | `392b7439` | Gameplan Skincare |
| #ATM015 | HpO | geoff@drinkhpo.com | Zerra Nutrition Inc. | `email_unique` | `64696c2b` | HpO |
| #ATM014 | La Monjita | pablo@alius.vc | Alius Ventures LLC | `email_unique` | `c6ac98a8` | La Monjita |
| 🟡 #ATM013 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| #ATM012 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| 🟡 #ATM011 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| 🟡 #ATM010 | Good Twin | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `d521d190` | Good Twin |
| #ATM009 | Gameplan Skincare | gabby@gameplanskincare.com | GamePlan Skincare, Inc. | `email_unique` | `392b7439` | Gameplan Skincare |
| #ATM008 | HpO | geoff@drinkhpo.com | Zerra Nutrition Inc. | `email_unique` | `64696c2b` | HpO |
| #ATM007 | Jolene Coffee | jake@jolenecoffee.com | GBE Jolene Liquids LLC | `email_unique` | `2f286a9b` | Jolene Coffee |
| #ATM006 | La Monjita | pablo@alius.vc | Alius Ventures LLC | `email_unique` | `c6ac98a8` | La Monjita |
| 🟡 #ATM005 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| 🟡 #ATM004 | Afterdream | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `f2796364` | Afterdream |
| 🟡 #ATM003 | Good Twin | ap@amass.com | Amass Brands Inc. | `email_collision_resolved_by_name` | `d521d190` | Good Twin |
| #ATM002 | HpO | geoff@drinkhpo.com | Zerra Nutrition Inc. | `email_unique` | `64696c2b` | HpO |
| #ATM001 | HpO | geoff@drinkhpo.com | Zerra Nutrition Inc. | `email_unique` | `64696c2b` | HpO |

### Amass-cluster check (24 rows total)

After name-aware disambiguation:

| destination client | invoice count |
|---|---:|
| `f2796364` Afterdream | 14 |
| `d521d190` Good Twin | 9 |
| `2f472d23` Amass Brands | 1 |
| **Total ap@amass.com invoices** | **24** |

All 24 are routed by the `email_collision_resolved_by_name` rule (3 candidates → 1 unique by name). None fall through to "unresolved".

---

## Section 5 — Records needing manual review

### 4 proposals with `match_type = 'none'`

These were converted to opportunities in the previous step (and now carry `opportunity_id`). Their opportunity records have the contact info, but the contact emails don't match any client (they're prospects, not clients). Recommendation: **leave `client_id` NULL on these proposals.**

| proposal | client_name | client_email | client_company | linked opportunity | recommendation |
|---|---|---|---|---|---|
| #PROP002 | Dulce Bingham | dbingham@backbarproject.com | Giffard | `d7e1a2b9` (stage=`lost`) | Leave `client_id = NULL`. Lost lead, no client to attach. Optionally mark proposal `archived` later. |
| #PROP004 | Diego Mondragon | diego@mesasana.com | Reset Wellness | `3d89125e` (stage=`proposal_sent`) | Leave `client_id = NULL`. Open prospect — only attach a client_id if/when the deal closes and a client row is created. |
| #PROP005 | Logan Pollack | lpollack@durwoodst.com | Vista Energy | `ccbbe195` (stage=`proposal_sent`) | Same as above. Leave `client_id = NULL`. |
| #PROP007 | Scott Lerner | slerner@fordgum.com | Military Energy Gum | `54043729` (stage=`proposal_sent`) | Same as above. Leave `client_id = NULL`. |

For the schema work itself, this means **`proposals.client_id` must be nullable** (an open proposal can exist with no linked client yet — the chain is `opportunity → proposal → client` and the client row only appears at win).

### 0 records hit `email_collision_unresolved`

Every `ap@amass.com` row had a `client_name` that uniquely identified one of the three Amass clients. **No manual disambiguation needed for the migration as data stands today.**

---

## Section 6 — Sanity checks (per-client rollup before vs after)

| client_id | name | company | status | audit §6 (old matcher, total) | dry-run total | proposals | agreements | invoices | Δ |
|---|---|---|---|---:|---:|---:|---:|---:|---|
| `d521d190` | Good Twin | Amass Brands Inc. | cancelled | 27 | **9** | 0 | 0 | 9 | **−18** (lost Afterdream + Amass Brands invoices to correct rows) |
| `f2796364` | **Afterdream** | Amass Brands Inc. | active | 0 | **17** | 0 | 0 | 17 | **+17** ✅ recovered from collision |
| `2f472d23` | **Amass Brands** | Amass Brands, Inc. | active | 0 | **1** | 0 | 0 | 1 | **+1** ✅ recovered from collision |
| `2f286a9b` | Jolene Coffee | GBE Jolene Liquids LLC | active | 17 | 17 | 0 | 0 | 17 | unchanged |
| `fd7e52d9` | Summer Water | Maison Thomas LLC | cancelled | 8 | 8 | 0 | 0 | 8 | unchanged |
| `64696c2b` | HpO | Zerra Nutrition Inc. | cancelled | 6 | 6 | 0 | 0 | 6 | unchanged |
| `ad72d295` | Chaser Water | Chaser Water LLC | active | 5 | 5 | 2 | 1 | 2 | unchanged |
| `392b7439` | Gameplan Skincare | GamePlan Skincare, Inc. | active | 5 | 5 | 0 | 0 | 5 | unchanged |
| `c6ac98a8` | La Monjita | Alius Ventures LLC | active | 5 | 5 | 0 | 0 | 5 | unchanged |
| `7665b537` | Oishii Sake | Oishii Sake | active | 4 | 4 | 1 | 1 | 2 | unchanged |
| `8ff2e074` | Osia | Osia LLC | active | 4 | 4 | 1 | 1 | 2 | unchanged |
| `99204359` | Khloud | Khloud LLC | cancelled | 2 | 2 | 0 | 0 | 2 | unchanged |
| `5a9dbec6` | Stuzzi Hot Sauce | Casa Komos Beverages | cancelled | 2 | 2 | 0 | 0 | 2 | unchanged |
| **TOTAL** | | | | | **85** | 4 | 3 | 78 | + 4 unmatched proposals |

### Movement worth flagging

- ✅ **Afterdream goes from 0 → 17** records. Was orphaned by the old matcher; now correctly attributed.
- ✅ **Amass Brands goes from 0 → 1** record. Same story.
- ⚠ **Good Twin drops 27 → 9**. Expected — the previous count was inflated. **Confirm before migration**: 9 invoices is the real Good Twin volume; the 18 that left went to Afterdream (17) + Amass Brands (1). Spot-check by `client_name` on a few of the originals if you want extra confidence.
- ✅ **No client goes from "had records" to "0 records"** — no breakage.

---

## Section 7 — Proposed UPDATE statements

⚠ **DO NOT RUN AS-IS.** These assume `proposals.client_id`, `agreements.client_id`, `invoices.client_id` columns already exist. Add them first (nullable, `references public.clients(id) on delete restrict`), then run these.

### Proposals (4 statements; 4 orphans skipped — keep `client_id` NULL)

```sql
-- Proposals — 4 of 8 link cleanly. The 4 with match_type='none' (PROP002,
-- PROP004, PROP005, PROP007) stay with NULL client_id by design (they're
-- prospects, not clients). The proposals.client_id column must be nullable.
UPDATE proposals SET client_id = '7665b537-8545-4046-be14-80bc97f1d74c' WHERE id = '078a92ad-3d45-4ad2-b428-4700e13e0010'; -- #PROP001 → Oishii Sake
UPDATE proposals SET client_id = '8ff2e074-babf-435c-aea5-e0cc6872cbf9' WHERE id = 'b8ec6aad-065a-42d5-8972-030665eae363'; -- #PROP003 → Osia
UPDATE proposals SET client_id = 'ad72d295-a69e-4b76-9b1b-83b93d6db812' WHERE id = '6c8a8153-434b-4e3b-85a4-387a1708ba0a'; -- #PROP006 → Chaser Water
UPDATE proposals SET client_id = 'ad72d295-a69e-4b76-9b1b-83b93d6db812' WHERE id = 'eb3fd265-9ee3-45af-8431-cc96ddd9a0db'; -- #PROP008 → Chaser Water
```

### Agreements (3 statements)

```sql
-- All 3 agreements link cleanly via email_unique.
UPDATE agreements SET client_id = '8ff2e074-babf-435c-aea5-e0cc6872cbf9' WHERE id = '2a4c1c39-fbc0-4a33-b675-0969b5fdd495'; -- ATMSA001 → Osia
UPDATE agreements SET client_id = '7665b537-8545-4046-be14-80bc97f1d74c' WHERE id = '0a4ae1b0-423d-48cb-bcf1-ce6e7c1f5577'; -- ATMSA003 → Oishii Sake
UPDATE agreements SET client_id = 'ad72d295-a69e-4b76-9b1b-83b93d6db812' WHERE id = 'be70779e-578c-4e16-bf08-6d93743b2d47'; -- ATMSA004 → Chaser Water
```

### Invoices (78 statements)

```sql
-- All 78 invoices link cleanly. 24 ap@amass.com invoices use the
-- email_collision_resolved_by_name rule (split across Afterdream / Good
-- Twin / Amass Brands by client_name). 9 use company_exact (rows with no
-- email — Stuzzi / Summer Water / Khloud). 1 uses name_only (#ATM079:
-- Chaser Water with empty email and company).

-- Sorted alphabetically by invoice number for easier review/diff.
UPDATE invoices SET client_id = '64696c2b-86f8-4e33-94e1-10d864f6924a' WHERE id = 'cc90bd5d-9a3d-4641-bb34-28320f13c976'; -- #ATM001 → HpO
UPDATE invoices SET client_id = '64696c2b-86f8-4e33-94e1-10d864f6924a' WHERE id = 'a5a77d29-5491-4b8e-b66a-d3dc784efca7'; -- #ATM002 → HpO
UPDATE invoices SET client_id = 'd521d190-d04d-4eed-94dc-eb88d4dc1772' WHERE id = 'fea062f9-720e-4811-a13d-666f4e9988af'; -- #ATM003 → Good Twin (collision_resolved_by_name)
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = '6462ed50-f935-4b64-823d-b4066392b3c4'; -- #ATM004 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = 'a3ff1689-fab1-46b1-8a72-0b550d91cb34'; -- #ATM005 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = 'c6ac98a8-526b-445d-868a-04c295b16b1f' WHERE id = '51475cd1-4261-409b-9b48-22645576151c'; -- #ATM006 → La Monjita
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = '4057c1b6-541d-4bda-9622-11a55e026726'; -- #ATM007 → Jolene Coffee
UPDATE invoices SET client_id = '64696c2b-86f8-4e33-94e1-10d864f6924a' WHERE id = '05a0970a-339a-4654-8859-6e8ee5a2fb76'; -- #ATM008 → HpO
UPDATE invoices SET client_id = '392b7439-3ee1-42f2-8707-9598b2b76bec' WHERE id = '655c628e-e524-49ac-98ff-79a2364606b8'; -- #ATM009 → Gameplan Skincare
UPDATE invoices SET client_id = 'd521d190-d04d-4eed-94dc-eb88d4dc1772' WHERE id = 'e06bc091-8236-4f11-9bf6-541f509af327'; -- #ATM010 → Good Twin (collision_resolved_by_name)
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = '289311c6-048c-464f-b720-1493e6053230'; -- #ATM011 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = '98409257-34fc-4c0a-9082-7a22b52943ca'; -- #ATM012 → Jolene Coffee
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = '06d91287-6584-465d-a805-52fce3647e00'; -- #ATM013 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = 'c6ac98a8-526b-445d-868a-04c295b16b1f' WHERE id = 'b96815a8-3d3a-4d2d-a519-7c3298e507ff'; -- #ATM014 → La Monjita
UPDATE invoices SET client_id = '64696c2b-86f8-4e33-94e1-10d864f6924a' WHERE id = 'bfd683b8-ba0b-4c82-ab2b-5bc395972661'; -- #ATM015 → HpO
UPDATE invoices SET client_id = '392b7439-3ee1-42f2-8707-9598b2b76bec' WHERE id = 'efca6927-1fec-4a4c-9a9a-b84d46cefdb1'; -- #ATM016 → Gameplan Skincare
UPDATE invoices SET client_id = '392b7439-3ee1-42f2-8707-9598b2b76bec' WHERE id = '4e2c96ae-d8d7-4853-a251-999363f72907'; -- #ATM017 → Gameplan Skincare
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = '056c4507-a73e-4cd4-bf06-21f0940b939e'; -- #ATM018 → Jolene Coffee
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = 'd94cebdb-6b42-495c-8006-7221c5f67fcb'; -- #ATM019 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = 'd521d190-d04d-4eed-94dc-eb88d4dc1772' WHERE id = '67a9f03f-5d2d-4428-8e38-658e8d038cbe'; -- #ATM020 → Good Twin (collision_resolved_by_name)
UPDATE invoices SET client_id = 'c6ac98a8-526b-445d-868a-04c295b16b1f' WHERE id = '0debc9c2-10e4-4489-bd14-3897d863887e'; -- #ATM021 → La Monjita
UPDATE invoices SET client_id = '64696c2b-86f8-4e33-94e1-10d864f6924a' WHERE id = '1da87f8b-f174-42d3-b64b-1ab331eea6a0'; -- #ATM022 → HpO
UPDATE invoices SET client_id = 'd521d190-d04d-4eed-94dc-eb88d4dc1772' WHERE id = '504b2fbb-5a12-4864-9adc-df9f6fb3c256'; -- #ATM023 → Good Twin (collision_resolved_by_name)
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = 'ccc27a6a-a577-4c59-8f61-5baf1d4118a7'; -- #ATM024 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = 'd607a917-a9f2-4baf-9d80-4238800f0fc1'; -- #ATM025 → Jolene Coffee
UPDATE invoices SET client_id = '392b7439-3ee1-42f2-8707-9598b2b76bec' WHERE id = 'de8f3684-63b3-4612-b262-d8b8a9c0c293'; -- #ATM026 → Gameplan Skincare
UPDATE invoices SET client_id = 'c6ac98a8-526b-445d-868a-04c295b16b1f' WHERE id = 'fba51c07-fe5e-4483-b112-61bcec2bc702'; -- #ATM027 → La Monjita
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = '19c740ea-144b-4878-847e-9849e01fa96f'; -- #ATM028 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = 'd521d190-d04d-4eed-94dc-eb88d4dc1772' WHERE id = '9ab0e997-cf05-4549-aff0-becbc906eeb4'; -- #ATM029 → Good Twin (collision_resolved_by_name)
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = '23be45e7-17c2-439e-991b-e0dd78d5f603'; -- #ATM030 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = '392b7439-3ee1-42f2-8707-9598b2b76bec' WHERE id = '14172997-4abe-4634-92a8-cb05471829fa'; -- #ATM031 → Gameplan Skincare
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = 'b3e243d5-b6dd-4af2-a8a4-e8b953a18357'; -- #ATM032 → Jolene Coffee
UPDATE invoices SET client_id = '2f472d23-a716-4d63-a49a-8a64e98ce046' WHERE id = '7f15486c-3b7e-4af2-9d1f-b190b2a2c245'; -- #ATM033 → Amass Brands (collision_resolved_by_name)
UPDATE invoices SET client_id = '7665b537-8545-4046-be14-80bc97f1d74c' WHERE id = '3db338a0-a9df-4e77-a234-994697e623e6'; -- #ATM034 → Oishii Sake
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = 'c93b3064-0a0f-4c98-a865-8c2410155b39'; -- #ATM035 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = 'c6ac98a8-526b-445d-868a-04c295b16b1f' WHERE id = 'e5a1bf4e-10f1-4431-9c38-bb277ad5ab40'; -- #ATM036 → La Monjita
UPDATE invoices SET client_id = '7665b537-8545-4046-be14-80bc97f1d74c' WHERE id = '06d11f69-b497-4baa-9203-638102fe92ef'; -- #ATM037 → Oishii Sake
UPDATE invoices SET client_id = 'd521d190-d04d-4eed-94dc-eb88d4dc1772' WHERE id = 'f6f27830-74cd-4143-b346-7ba6bf3b0b3c'; -- #ATM039 → Good Twin (collision_resolved_by_name)
UPDATE invoices SET client_id = 'd521d190-d04d-4eed-94dc-eb88d4dc1772' WHERE id = '9d4bd262-9674-47d6-8c20-a9b64cbb1c51'; -- #ATM040 → Good Twin (collision_resolved_by_name)
UPDATE invoices SET client_id = 'd521d190-d04d-4eed-94dc-eb88d4dc1772' WHERE id = 'aedfbe89-9af0-420e-9c15-855f592560ea'; -- #ATM041 → Good Twin (collision_resolved_by_name)
UPDATE invoices SET client_id = 'fd7e52d9-9f1d-41d1-af93-2f7fa145cb70' WHERE id = 'd0facede-9f00-4d03-80fa-8215b0464f2c'; -- #ATM042 → Summer Water (company_exact)
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = '124c2cfe-de8e-4dce-8ed0-b00d609186c3'; -- #ATM043 → Jolene Coffee
UPDATE invoices SET client_id = 'd521d190-d04d-4eed-94dc-eb88d4dc1772' WHERE id = '15ca0840-41ed-4b54-b91e-0134b6bcc31b'; -- #ATM044 → Good Twin (collision_resolved_by_name)
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = 'ef86406a-7665-40fc-a5dc-98649a59b62e'; -- #ATM045 → Jolene Coffee
UPDATE invoices SET client_id = 'fd7e52d9-9f1d-41d1-af93-2f7fa145cb70' WHERE id = 'b5c2be73-ff3c-4362-bd7b-fa5cd403a67a'; -- #ATM046 → Summer Water (company_exact)
UPDATE invoices SET client_id = 'fd7e52d9-9f1d-41d1-af93-2f7fa145cb70' WHERE id = '70375e7b-f7f0-4fbf-89e7-0de0c1b21f89'; -- #ATM047 → Summer Water (company_exact)
UPDATE invoices SET client_id = 'fd7e52d9-9f1d-41d1-af93-2f7fa145cb70' WHERE id = '5afc3478-3b4c-435c-abdb-a62cbb8c64ad'; -- #ATM048 → Summer Water (company_exact)
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = '40c4d0f8-58ca-4221-8639-a647a1fbf26b'; -- #ATM049 → Jolene Coffee
UPDATE invoices SET client_id = 'fd7e52d9-9f1d-41d1-af93-2f7fa145cb70' WHERE id = '34ca455e-7cdb-4fe4-aa4a-8d201dfc3293'; -- #ATM050 → Summer Water (company_exact)
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = '04bc0d26-bdaf-487f-8991-adeddc8df8bb'; -- #ATM051 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = '0a7f6983-832f-44cc-b030-270efee81914'; -- #ATM052 → Jolene Coffee
UPDATE invoices SET client_id = 'fd7e52d9-9f1d-41d1-af93-2f7fa145cb70' WHERE id = '2083f2f6-f684-45fe-9a30-c86b0e7e6797'; -- #ATM053 → Summer Water (company_exact)
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = 'c0bb59c0-af6a-45ac-80da-3305be1d77f9'; -- #ATM054 → Jolene Coffee
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = '03403873-97b4-47c8-98fd-75ac7c1dda33'; -- #ATM055 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = '66a90e22-2188-4db4-a316-302c64fc725e'; -- #ATM056 → Jolene Coffee
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = '19bf4016-6ed3-4662-90a8-ed71707551ea'; -- #ATM057 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = 'ed222bbb-92e8-44aa-b37f-f911dd185b13'; -- #ATM058 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = '99204359-8252-4089-98ff-297740dbfc85' WHERE id = 'f19d5a9c-5c53-448d-ab99-f2a8ea20f961'; -- #ATM059 → Khloud (company_exact)
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = '1c764242-8131-485e-99f0-3dfb612ecd05'; -- #ATM060 → Jolene Coffee
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = '45934264-9a64-418a-bafb-64061f2cb6c7'; -- #ATM061 → Jolene Coffee
UPDATE invoices SET client_id = '99204359-8252-4089-98ff-297740dbfc85' WHERE id = '6684ca05-c016-484c-969b-3c488dd82518'; -- #ATM062 → Khloud (company_exact)
UPDATE invoices SET client_id = '5a9dbec6-f6a0-4928-99f7-c13fc4c09dba' WHERE id = 'afb319aa-09f3-4097-83f0-f8af0586f9fa'; -- #ATM063 → Stuzzi Hot Sauce (company_exact)
UPDATE invoices SET client_id = 'fd7e52d9-9f1d-41d1-af93-2f7fa145cb70' WHERE id = '12eb5713-caa2-4994-9e16-d808624010b0'; -- #ATM064 → Summer Water (company_exact)
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = '86814fd1-6aa4-41d9-9d2b-62bbc89b2ca9'; -- #ATM065 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = '16e26d08-cb7d-406d-a859-2c8175e76d6a'; -- #ATM066 → Jolene Coffee
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = '18493a3d-d181-4c95-b358-6df585e65623'; -- #ATM067 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = 'c0df0652-c694-4a0c-b97f-5ab085a433f2'; -- #ATM068 → Jolene Coffee
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = '7eb185c0-8348-4f59-bc6d-58beb43bca96'; -- #ATM069 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = '533d0e67-d4b5-4129-b67d-943eb8d0a316'; -- #ATM070 → Jolene Coffee
UPDATE invoices SET client_id = '64696c2b-86f8-4e33-94e1-10d864f6924a' WHERE id = 'ef6fe01e-7d03-48c9-8899-acee3d61e758'; -- #ATM071 → HpO
UPDATE invoices SET client_id = 'f2796364-fe8a-4bd1-9d21-8623cbad221e' WHERE id = 'eb65d0fd-f57d-4775-98e1-8a40e5c453dc'; -- #ATM072 → Afterdream (collision_resolved_by_name)
UPDATE invoices SET client_id = 'fd7e52d9-9f1d-41d1-af93-2f7fa145cb70' WHERE id = '2f2e4428-0523-408f-8a26-3a33b83a5826'; -- #ATM073 → Summer Water (company_exact)
UPDATE invoices SET client_id = '2f286a9b-27c6-49c5-8161-0e3891afffad' WHERE id = 'bf89eee1-9737-46ab-b59c-140b6aa659d3'; -- #ATM074 → Jolene Coffee
UPDATE invoices SET client_id = '5a9dbec6-f6a0-4928-99f7-c13fc4c09dba' WHERE id = '795df715-3ade-43ae-9937-fa9bbf80568a'; -- #ATM075 → Stuzzi Hot Sauce (company_exact)
UPDATE invoices SET client_id = '8ff2e074-babf-435c-aea5-e0cc6872cbf9' WHERE id = '3311b880-3676-4a81-b056-114505282bfd'; -- #ATM076 → Osia
UPDATE invoices SET client_id = '8ff2e074-babf-435c-aea5-e0cc6872cbf9' WHERE id = '4c572ff2-aeb3-4ecb-8d3c-5c0cddd3da1f'; -- #ATM077 → Osia
UPDATE invoices SET client_id = 'ad72d295-a69e-4b76-9b1b-83b93d6db812' WHERE id = '50440ba9-0f30-4493-83dc-d5c471019292'; -- #ATM079 → Chaser Water (name_only)
UPDATE invoices SET client_id = 'ad72d295-a69e-4b76-9b1b-83b93d6db812' WHERE id = '68a1a448-67c3-434e-9a2a-7bccd5fef8dc'; -- #ATM080 → Chaser Water
```

### Verification queries to run after backfill

```sql
-- Should return 0
SELECT count(*) FROM agreements WHERE client_id IS NULL;
SELECT count(*) FROM invoices WHERE client_id IS NULL;

-- Should return exactly 4 (the orphan proposals)
SELECT count(*) FROM proposals WHERE client_id IS NULL;
SELECT number, client_company FROM proposals WHERE client_id IS NULL ORDER BY number;
-- Expect: PROP002 Giffard, PROP004 Reset Wellness, PROP005 Vista Energy, PROP007 Military Energy Gum

-- Per-client invoice counts post-migration — match Section 6 above
SELECT c.name, count(*) AS invoice_count
FROM invoices i JOIN clients c ON c.id = i.client_id
GROUP BY c.name ORDER BY count(*) DESC;
```
