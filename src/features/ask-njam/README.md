# Ask Njam

The assistant. It answers four kinds of question: recipes with a product you
scanned or name, why something got its verdict, what an ingredient, allergen or
E-number is, and what to eat instead.

- **Njam explains; the engine decides.** The `ask-njam` edge function returns
  JSON blocks (`text`, `product`, `recipe`, `suggestions`). A `product` block
  holds only a catalogue id: `AnswerBlocks.tsx` loads the product and runs
  `decideVerdict` to draw its chip. A Safe chip can never come from the AI.
- **"Safe" is reserved.** The function removes any sentence in which the AI calls
  something safe (`supabase/functions/ask-njam/validate.ts`).
- **Recipe ingredients.** A catalogue product shows its own chip. Any other
  ingredient can only be proved Not safe (from the allergen the AI tagged it
  with); otherwise it says "Not checked against your rules".
- **Rules come from the database, not the app.** The function reads your rules,
  recent scans and earlier messages with your JWT, so RLS applies.
- **Saved conversations.** `chat_conversations` and `chat_messages`, written by
  the function and read here (`conversations.ts`). Private to you. Tap "Ask
  Njam" at the top of the chat for the full-screen list, grouped by Today,
  Yesterday and Earlier; the "+" on the right starts a new one.
- **Ghost text.** `use-ghost-text.ts` asks for the rest of your sentence after a
  400 ms pause (3 characters minimum, one request per pause, stale requests
  cancelled, late replies ignored). `ChatComposer` draws it behind the input.
- No medical advice: Njam says so and suggests a doctor or dietitian.
- Entry point: `AskNjamHeader`, the AiAvatar button on Home, Search, History and
  Profile. Not on the Scanner.
