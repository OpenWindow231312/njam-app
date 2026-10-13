# API: the routes Njam's app calls

Njam has no server of its own to host. The backend is Supabase: two Edge
Functions for the AI, and the database's REST API (PostgREST) for
everything else, protected by Row Level Security. Base URL:
`https://<project-ref>.supabase.co`.

Every request carries the signed-in person's JWT
(`Authorization: Bearer <access token>`) and the publishable key
(`apikey`). The Gemini key never leaves the Edge Functions.

## Edge Functions (the AI)

Both run with `verify_jwt` on, so a request without a valid sign-in is
refused before the function starts. Errors always have the same shape:

```json
{ "ok": false, "error": { "code": "timeout", "message": "A sentence the app can show as it is." } }
```

### `POST /functions/v1/scan-label`

Reads an ingredient list from a label photo or from typed text.

| Request body | Meaning |
| --- | --- |
| `{ "imageBase64": "...", "mimeType": "image/jpeg" }` | A label photo, under 4 MB |
| `{ "text": "Ingredients: wheat flour, sugar, ..." }` | Ingredient text (also used for Open Food Facts text) |
| `{ "mode": "front", "imageBase64": "...", "mimeType": "image/jpeg" }` | A photo of the front of the pack, read for its name and brand |

`200 { "ok": true, "data": LabelRead }`, where LabelRead is
`{ readable, productName, ingredients: [{ name, allergen, eNumber }], mayContain, confidence, problem }`.
In front mode, `data` is a FrontRead: `{ readable, name, brand, problem }`.

Errors: `400 bad_request`, `502 ai_failed`, `503 busy` (Gemini rate limit),
`504 timeout` (20 s), `500 not_configured`.

Called from: `src/services/ai/index.ts` (`readLabel`, `readFront`).

### `POST /functions/v1/ask-njam`

The assistant. Two modes.

**Chat**

```json
{ "message": "What can I make with Jungle Oats?", "conversationId": null }
```

`200 { "ok": true, "data": { "conversationId": "uuid", "blocks": [AskBlock] } }`.
A block is one of `text`, `product` (a catalogue id), `recipe` (title,
ingredients, steps) or `suggestions` (2 or 3 follow-up questions). The
function reads the person's rules, recent scans and earlier messages
itself, and saves the question and answer to `chat_conversations` and
`chat_messages`.

Errors: `400 bad_request`, `404 not_found` (not your conversation),
`502 ai_failed`, `503 busy`, `504 timeout` (20 s).

**Complete** (ghost text while typing)

```json
{ "mode": "complete", "text": "What can I make wi" }
```

`200 { "ok": true, "data": { "completion": "th Jungle Oats?" } }`, or
`completion: null`. It never returns an error to the app: ghost text is a
nicety, so any failure is `null`. Times out after 4 s.

Called from: `src/services/ai/index.ts` (`askNjam`, `completeMessage`).

## Database (Supabase REST, RLS on every table)

| Route | Verb | What for | Called from |
| --- | --- | --- | --- |
| `/rest/v1/users` | GET, POST | Your row; created at first sign-in | `features/auth/AuthProvider.tsx` |
| `/rest/v1/households` | POST | A new household at sign-up | `features/auth/AuthProvider.tsx` |
| `/rest/v1/diet_profiles` (+ `profile_rules`) | GET | The active profile and its rules | `features/profile/active-profile.ts` |
| `/rest/v1/products` (+ ingredients) | GET | Search, barcode lookup, a product by id | `features/verdict/catalogue.ts`, `features/home/ProductSearch.tsx` |
| `/rest/v1/products` | PATCH | Verify a product (admins only) | `features/admin-review/review-queue.ts` |
| `/rest/v1/rpc/add_product` | POST | Add a scanned product, its ingredients and their order in one transaction (always unverified) | `features/add-product/add-product.ts` |
| `/storage/v1/object/product-photos/<your user id>/...` | POST | Upload the front and label photos (only into your own folder) | `features/add-product/add-product.ts` |
| `/rest/v1/scans` | GET, POST | Save and read scan history | `features/verdict/scans.ts` |
| `/rest/v1/chat_conversations`, `/rest/v1/chat_messages` | GET | Your saved Ask Njam conversations | `features/ask-njam/conversations.ts` |

## Outside Supabase

| Route | What for | Called from |
| --- | --- | --- |
| `GET https://world.openfoodfacts.org/api/v2/product/<barcode>` | Ingredient text for a barcode not in Njam's catalogue (6 s timeout) | `features/scanner/open-food-facts.ts` |

## Trying it by hand

Sign in as a test account in the app, or get a token with the Supabase JS
client, then:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/ask-njam" \
  -H "Authorization: Bearer <access token>" \
  -H "apikey: <publishable key>" \
  -H "Content-Type: application/json" \
  -d '{ "mode": "complete", "text": "What is E6" }'
```
