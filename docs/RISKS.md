# Risks and technical challenges

The technical challenges named at the pitch, revisited at the milestone
(updated 14 Oct 2026, and 27 Oct 2026 for the Open Food Facts import): which
happened, how they were handled, and which remain.

| Risk | Happened? | How it was handled | Still open |
| --- | --- | --- | --- |
| **A false Safe verdict** (the AI misses an allergen) | Not seen | The AI never decides. A deterministic engine (`services/verdict`) does, and caps every unverified or AI-read record at Caution. In Ask Njam, any sentence calling food safe is removed, and chips come only from the engine. | The 50-product regression suite is not built yet (sprint 3). |
| **A false Safe from Open Food Facts** (a volunteer's list is wrong or out of date) | Not seen | Accepted on purpose (27 Oct 2026) so that about 750 imported products can give a normal verdict. Limited by: no AI anywhere in the import; a record with fewer than three ingredients stays at Caution and is hidden from Home; declared allergen tags are added as ingredients, which can only make a verdict stricter; the Verdict screen says the list is from Open Food Facts. | A recipe change after the record was written is not caught. An admin can still verify or correct a product. |
| **The AI makes things up** (ingredients, product ids) | Expected of any language model, so guarded against from the start | Structured JSON output against a schema, then validation in the Edge Function: unknown ids dropped, allergens limited to our eight, unreadable labels marked unreadable rather than guessed. | Wording quality varies; keep testing prompts. |
| **API key exposure** | No | The Gemini key is an Edge Function secret. The app holds only the Supabase publishable key; RLS protects the data. | None |
| **Data leaking between households / role abuse** | Yes: a policy let anyone make themselves admin or join another household | Found in review, fixed by migration `20261013063914`, and proved with impersonation tests (see `TESTING.md`). | Household invites need a server-side check when built. |
| **South African barcodes missing from any database** | Yes | About 980 South African products imported from Open Food Facts (27 Oct 2026). A barcode still missing is looked up in Open Food Facts on its first scan and saved, then a label photo read by Gemini is the last resort. | Seed barcodes are placeholders until replaced with real ones. |
| **Home slow with a thousand products** | Possible | The products are kept in memory for ten minutes instead of fetched on every visit, and the grid draws 40 cards at a time. | Verdicts are decided on the phone, so search stays on the phone too. |
| **Speed: a verdict in under 3 seconds** | Partly | Catalogue lookups are fast. A label photo goes through Gemini and can take several seconds; the loading state says what is happening. | Measure and record real timings; consider a smaller photo. |
| **Gemini rate limits or outages** | Possible on the free tier | A 429 answers "busy, try again in a minute"; every AI failure has a message and a retry. | None beyond the free-tier limit. |
| **No nutrition data** | Yes | Nutrient limits are reported as "could not check", which is Caution, never Safe. | About 400 imported products have a nutrition table that passed the import's checks. Products without one still show Caution for a nutrient limit. |
| **Testing the camera** | Yes: the simulator cannot scan | All scanner testing on a physical phone through Expo Go. | None |
| **Scope: ten screens in four weeks** | Partly | Scope frozen in `SCOPE.md`: Must first, Nice only if there is time. | Every Must is built. What remains is proving it: the regression suite and real barcodes. |
