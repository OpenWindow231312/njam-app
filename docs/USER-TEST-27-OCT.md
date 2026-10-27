# User test, 27 Oct 2026

Anika de Beer (the author) went through the whole app on her phone as a new
person: sign up, onboarding, Home, Aisle, saving, Scanner, Your scans and
Profile. The notes below are what she saw and what she wants changed, grouped
so each group can be fixed in its own chat and on its own `anika/` branch.

Each group ends with a prompt to paste into a new chat.

---

## 1. Onboarding: setting your rules

Files: `src/features/onboarding/OnboardingScreen.tsx`

What happened:

- After ticking an allergy (peanuts, gluten), "How strict is each one" appears
  at the bottom of the screen. You have to scroll down after every tick to set
  the severity, and it is easy to miss.
- There is no explanation of what avoid, moderate and severe mean.
- "Your profile is ready" has no back button.
- On "Your profile is ready" there is an odd gap between the text and the
  summary of your allergens and diets. The screen looks unbalanced.
- The buttons ("Open home", "Change my rules") sit in the content instead of
  at the bottom of the screen.
- "Open home" then shows "Checking your catalogue against your rules" for a
  long time.

What to change:

- Ask severity right where the allergy is chosen: tapping an allergy opens its
  severity choice in place (inline under the chip, or a small sheet), so you
  never have to scroll to find it.
- An info button next to "How strict" that explains each level in plain words,
  for example: severe means even a trace is dangerous.
- A back button on "Your profile is ready".
- Remove the gap; pin the buttons to the bottom of the screen.
- Find out why the first catalogue check is slow and make it faster, or show
  progress honestly.

> Prompt: Fix the onboarding feedback from docs/USER-TEST-27-OCT.md, section 1.
> Work on branch `anika/onboarding-fixes`. Explain your plan before you build.

---

## 2. Home screen

Files: `src/features/home/HomeScreen.tsx`, `src/features/home/HomeScope.tsx`

What happened:

- The scan button next to the search bar repeats the "Scan a barcode" quick
  tip right below it.
- The "5 rules" chip next to the scope dropdown is a different size from the
  dropdown, and it is not clear why it is there.
- Ask Njam is hard to find. Its entry point on the right of the header looks
  like a profile picture.
- Saving (bookmarking) a product gives no feedback.

What to change:

- Remove the scan button beside the search bar.
- Remove the rules-count chip, or make it the same size as the dropdown and
  give it a clear job (see question A below).
- Make Ask Njam clearly an assistant, not an avatar (see question C below).
- Show a snackbar when a product is saved, with Undo (see question B below).

> Prompt: Fix the Home screen feedback from docs/USER-TEST-27-OCT.md,
> section 2. Work on branch `anika/home-fixes`. Ask me before changing any
> shared component.

---

## 3. Aisle and store filter

Files: `src/app/aisle.tsx`, `src/features/home/`

What happened:

- Aisle looks good and the store filter works.
- Products that came from Open Food Facts (for example Monster Energy
  Absolute Zero) have no stores, so filtering by store hides them. Store is
  not a reliable way to filter a catalogue that keeps growing from scans.

What to change: decide on a better primary filter (see question D below).

> Prompt: Rethink the Aisle filter, docs/USER-TEST-27-OCT.md section 3.
> Products from Open Food Facts have no stores. Propose options first, do not
> build yet.

---

## 4. Your scans (History)

Files: `src/features/home/HistoryScreen.tsx`

What happened: the page works but looks bad. It needs a redesign.

> Prompt: Redesign the Your scans page, docs/USER-TEST-27-OCT.md section 4.
> Show me two or three layout directions first, using only tokens from
> `src/theme/tokens.ts`. Branch `anika/history-redesign`.

---

## 5. Top bars and scroll fade (every screen)

Files: `src/components/design-system/TopBar.tsx`,
`src/components/design-system/FrostedStrip.tsx`

What happened:

- Your scans should show its title in the bar once you scroll (check this
  matches the change made on `anika/top-bar`).
- The bar is a solid `surface` colour, so a hard line forms where content
  scrolls under it.

What to change: add a short fade at the bottom edge of every top bar, from
`surface` to clear, the same way `FrostedStrip` already fades behind the
status bar. This touches the design system (gradient rule 3 has one exception
today), so it needs an approved change first.

> Prompt: Add a soft fade under every TopBar, docs/USER-TEST-27-OCT.md
> section 5. This changes design system rule 3, so first state what changes,
> where it surfaces and what it could break, then wait for my approval.

---

## 6. Profile: editing rules

Files: `src/features/profile/RulesTab.tsx`, `src/features/profile/rule-edits.ts`

What happened:

- Setting how severe an allergy is feels as awkward here as in onboarding.
- Tapping a rule shows "Remove from my rules" as a secondary button. For
  gelatin (no severity) it is the only action, so it reads as weak. For tree
  nuts, the sheet asks "How bad is the reaction?" (avoid, moderate, severe)
  and Remove sits under it.

What to change:

- Use the same severity control and info button as onboarding (group 1), so
  both screens match.
- Decide the button hierarchy: when Remove is the only action it should be
  the primary button; when the sheet also edits severity, Remove can stay
  secondary. Removing is destructive, so consider a confirm step.

> Prompt: Fix the Profile rules feedback, docs/USER-TEST-27-OCT.md section 6.
> Reuse the severity control from the onboarding fixes if they are merged.
> Branch `anika/profile-rules-fixes`.

---

## 7. Scanner

Files: `src/features/scanner/ScannerScreen.tsx`

What happened: scanning works well.

What to change: add a keyboard icon button to the left of the flashlight. It
opens the "type the barcode" page straight away, for when the camera does not
work or the barcode will not read.

> Prompt: Add a "Type the barcode" icon button beside the flashlight,
> docs/USER-TEST-27-OCT.md section 7. Branch `anika/scanner-type-barcode`.

---

## Open questions and suggested answers

**A. The "5 rules" chip on Home.** It tells you how many rules the verdicts
use, which the scope dropdown already implies. Suggestion: remove it. If the
count matters, put it inside the dropdown's sheet ("Your rules, 5").

**B. Feedback when you save a product.** Shopping and recipe apps (Instagram,
Takealot, Woolworths, Pinterest) fill the bookmark icon straight away and show
a short snackbar: "Saved to your list" with View or Undo. The filled icon alone
is too small to notice on a card. Suggestion: fill the icon and show the
existing `Snackbar` for about three seconds with Undo. No full pop-up, it
interrupts browsing.

**C. Making Ask Njam visible.** A round icon top right reads as a profile
picture. Options, from smallest change to largest:

1. Replace it with a labelled pill button, "Ask Njam", with the chat icon.
2. A card on Home under the search bar: "Ask Njam what you can eat",
   with one or two example questions you can tap.
3. A link from each verdict: "Ask Njam about this product".

Suggestion: 1 and 3 together. The label fixes the confusion, and the verdict
link puts the AI where people have a question. Never use a sparkle icon.

**D. Filtering when stores are unknown.** Most new products come from Open
Food Facts with no store. Better primary filters are ones every product has:
your verdict (Safe, Caution, Not safe) and category (snacks, drinks, dairy).
Keep store as a secondary filter, and say plainly that it only covers products
with known stores.
