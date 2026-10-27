# Scope: what Njam's MVP is, frozen at the milestone

Agreed for the 14 Oct 2026 milestone check. Anything not under **Must** is
not promised for the final hand-in on 28 Oct 2026.

Status: **Built** works in the app today. **Partly** exists but is
incomplete. **To build** is planned for weeks 3 and 4 (see `PLAN.md`).

## Must (the frozen MVP)

| Feature | Status | Where |
| --- | --- | --- |
| Sign up, log in, log out | Built | `features/auth` |
| Roles: Household Owner, Standard User, Admin/Moderator, enforced by RLS | Built | migrations, `features/admin-review` |
| Scan a barcode with the scope pill showing whose profile it checks | Built | `features/scanner` |
| Lookup order: Njam catalogue, then Open Food Facts (saved on first scan), then a label photo read by Gemini | Built | `features/scanner`, `import-open-food-facts`, `scan-label` |
| Verdict engine: Safe, Caution or Not safe with reasons; unverified records capped at Caution, except complete Open Food Facts records | Built | `services/verdict` |
| A catalogue of South African products, imported from Open Food Facts | Built (27 Oct) | `import-open-food-facts`, `scripts/import-open-food-facts.mjs` |
| Verdict screen with mark, word and reason lines | Built | `features/verdict` |
| Scan history, reopened exactly as decided | Built | `features/home/HistoryScreen.tsx` |
| Search the catalogue | Built | `features/home` |
| Ask Njam: AI assistant using your rules, with verdict chips from the engine | Built | `features/ask-njam`, `ask-njam` |
| Admin review queue: verify products so they can be Safe | Built | `features/admin-review` |
| Set and edit your rules (allergies with severity, diets, ingredients and E-numbers) | Built | `features/onboarding`, `app/edit-rules.tsx` |
| Profile showing your rules, with a way to edit them | Built | `features/profile` |

Every Must is built as of 14 Oct 2026. Sprint 3 is about proving it
(regression suite, real barcodes) rather than adding features.

## Nice to have (only if Must is done)

| Feature | Status | Note |
| --- | --- | --- |
| Alternatives: safer products in the same category | To build | Category data exists |
| Add a product (photo plus ingredient list) into the review queue | Built | `features/add-product`, migration `20261013204726`; duplicates flagged in the review queue |
| Household screen: switch profile, add a child or guest profile | To build | Schema supports it |
| Nutrient limits checked against nutrition facts | Partly | About 420 products have nutrition facts (seeded and imported); any product without them still comes back Caution |
| Full onboarding across all six profile layers | Partly | Allergies, diets, ingredients and E-numbers are in onboarding; nutrient limits and health presets are not |

## Future (after hand-in)

- Dark mode (Forest). Paused on 29 Sep 2026; tokens kept.
- Household invites checked on the server.
- Real barcodes for the seed catalogue (they use the in-store `200` prefix).
- Offline scanning from a cached catalogue.
- The 50-product regression suite run automatically on every change.

## Changes since the pitch, and why

| Change | Why |
| --- | --- |
| **Added Ask Njam**, the assistant | Explaining a verdict, swapping a product and cooking with what you scanned are the questions people ask after a verdict. The AI explains; the engine still decides. |
| **Added Open Food Facts** before the label photo | Many South African barcodes are not in our catalogue. A public database can answer many of them without a photo; the photo is the fallback. Anything from it is unverified, so capped at Caution. |
| **Imported Open Food Facts in bulk, and let complete records give normal verdicts** (27 Oct) | With 30 products the app had little to show. About 980 South African products were imported, and a scan lookup is now saved the first time. Capping all of them at Caution made the catalogue useless, so a complete record (three or more ingredients, no AI involved) is decided like a verified one; a thin one stays at Caution and is hidden. The trade-off is recorded in `RISKS.md`. |
| **Dark mode paused** | Two themes doubled the checking on every screen. Paper only until the MVP is done. |
| **Nutrient limits moved to Nice** | There is no reliable source of South African nutrition facts yet. Unchecked limits show as Caution, never Safe. |
| **Workflow changed to one branch per feature** | Groups each feature's commits in the history with a merge commit. See `GIT-WORKFLOW.md`. |
