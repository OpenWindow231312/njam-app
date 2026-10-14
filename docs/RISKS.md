# Risks and technical challenges

The technical challenges named at the pitch, revisited at the milestone
(updated 14 Oct 2026): which happened, how they were handled, and which remain.

| Risk | Happened? | How it was handled | Still open |
| --- | --- | --- | --- |
| **A false Safe verdict** (the AI misses an allergen) | Not seen | The AI never decides. A deterministic engine (`services/verdict`) does, and caps every unverified or AI-read record at Caution. In Ask Njam, any sentence calling food safe is removed, and chips come only from the engine. | The 50-product regression suite is not built yet (sprint 3). |
| **The AI makes things up** (ingredients, product ids) | Expected of any language model, so guarded against from the start | Structured JSON output against a schema, then validation in the Edge Function: unknown ids dropped, allergens limited to our eight, unreadable labels marked unreadable rather than guessed. | Wording quality varies; keep testing prompts. |
| **API key exposure** | No | The Gemini key is an Edge Function secret. The app holds only the Supabase publishable key; RLS protects the data. | None |
| **Data leaking between households / role abuse** | Yes: a policy let anyone make themselves admin or join another household | Found in review, fixed by migration `20261013063914`, and proved with impersonation tests (see `TESTING.md`). | Household invites need a server-side check when built. |
| **South African barcodes missing from any database** | Yes | Three-step lookup: our catalogue, then Open Food Facts, then a label photo read by Gemini. | Seed barcodes are placeholders until replaced with real ones. |
| **Speed: a verdict in under 3 seconds** | Partly | Catalogue lookups are fast. A label photo goes through Gemini and can take several seconds; the loading state says what is happening. | Measure and record real timings; consider a smaller photo. |
| **Gemini rate limits or outages** | Possible on the free tier | A 429 answers "busy, try again in a minute"; every AI failure has a message and a retry. | None beyond the free-tier limit. |
| **No nutrition data** | Yes | Nutrient limits are reported as "could not check", which is Caution, never Safe. | 20 seeded products now have nutrition facts from Open Food Facts. Products without them still show Caution. |
| **Testing the camera** | Yes: the simulator cannot scan | All scanner testing on a physical phone through Expo Go. | None |
| **Scope: ten screens in four weeks** | Partly | Scope frozen in `SCOPE.md`: Must first, Nice only if there is time. | Every Must is built. What remains is proving it: the regression suite and real barcodes. |
