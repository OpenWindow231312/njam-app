# AI service

The single module the AI provider hides behind. The brief uses Google Gemini, but
nothing outside this folder imports a Gemini SDK. Swap the provider by editing
here and nowhere else.

**What the AI does:** it *interprets*. Ingredient to category, aliases, E-numbers,
plain-language reading of a label photo. It never *decides* a verdict on its own.

**What it must not do:** it cannot mark a record Safe. An unverified AI-read record
is capped at Caution. The decision lives in `src/services/verdict`, and on conflict
the rules engine wins.

**Secrets:** the Gemini key never appears in app code and is never prefixed with
`EXPO_PUBLIC_`. Anything needing it runs in a Supabase Edge Function. This module
calls that function; it does not hold the key.

Interface to design (keep it small and honest):

- input: a label photo or an ingredient string
- output: structured, typed data (ingredients, categories, E-numbers, a
  confidence and a "read from photo, not verified" flag)
