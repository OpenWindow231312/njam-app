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
  the function and read here (`conversations.ts`). Private to you. Tap the Njam
  logo at the top of the chat for a small menu: New conversation, Your
  conversations (the full-screen list, grouped by Today, Yesterday and
  Earlier) and What Njam can help with. The "+" on the right also starts a new one.
- **Ghost text.** `use-ghost-text.ts` asks for the rest of your sentence after a
  400 ms pause (3 characters minimum, one request per pause, stale requests
  cancelled, late replies ignored). `ChatComposer` draws it behind the input;
  swipe right on the bar to take it.
- **The typing bar** works like Claude's (28 Oct 2026): one row that grows to
  six lines, then scrolls. Return adds a new line; only send sends. Send turns
  into Stop while Njam answers.
- **Your messages.** Anything you send that runs past 8 lines folds behind
  "Show all". Hold one for Edit your question or Copy. Under Njam's latest
  answer: Copy and Ask again.
- **Edit and Ask again** delete the question and everything after it from
  `chat_messages` (`deleteFromQuestion`, allowed by the existing delete
  policy), then ask again, so the history Njam reads is the one you see.
  Messages are never updated in place.
- **Stop** hides the answer on its way and keeps your question, with Ask again.
  The function has already saved that question and answer together, so the
  stopped answer comes back when you reopen the conversation.
- **Did not go through.** A question that never reached Njam stays, faded,
  with the time and Try again. Nothing is resent until you tap it.
- Not built yet (part B): "+" in the bar for a barcode or label photo, and
  choosing whose rules Njam answers for.
- No medical advice: Njam says so and suggests a doctor or dietitian.
- Entry points: on Home, `AskNjamRow`, a white row under the search bar. On
  Search, History, Verdict, Aisle and Alternatives, `AskNjamButton`, a small
  tonal "Ask Njam" pill led by the Njam circle, on the right of the top bar.
  Not on the Scanner or Profile. It was the round AiAvatar
  alone until the 27 Oct user test, where it read as a profile picture.
