# Njam

An AI-driven grocery scanner for South Africa. A person sets their dietary rules once,
points the camera at a barcode, and gets one of three answers in under three seconds:
**Safe**, **Caution**, or **Not safe**, with the reasons that produced it.

Built for Interactive Development 300 (DV300) Theme 4 at Open Window. This is assessed
university work: the repository, the commit history and the author's ability to explain
every line are all marked.

---

## Stack

| Layer   | Choice                                                                                   |
| ------- | ---------------------------------------------------------------------------------------- |
| App     | React Native via Expo, TypeScript, Expo Router                                           |
| Camera  | `expo-camera`                                                                            |
| AI      | Google Gemini, behind a single service module so the provider can be swapped in one file |
| Backend | Supabase: PostgreSQL, Auth, Storage, Edge Functions                                      |
| State   | React Context + AsyncStorage                                                             |
| Fonts   | `@expo-google-fonts/bricolage-grotesque`, `@expo-google-fonts/figtree`                   |
| Icons   | Material Symbols Rounded                                                                 |

Run with `npx expo start`. Test on a physical phone through Expo Go, because the core
feature is the camera and the simulator cannot scan a barcode.

---

## How to work in this repo

**Explain before you build.** The author has to defend this code in a live code review
and a final demonstration. Prefer a clear, obvious implementation over a clever one.
Small functions, honest names, no abstraction that exists only to be elegant. When a
non-obvious decision is made, say why in a short comment or in the reply.

**One thing at a time.** Do not refactor files you were not asked to touch. Do not
"tidy up" adjacent code in the same change.

**Ask before:** adding a dependency, changing the folder structure, changing the database
schema, or changing anything in `src/theme/tokens.ts`.

**Never commit secrets.** Supabase keys, the Gemini key and anything else live in `.env`,
which stays in `.gitignore`. Client-side code uses the Supabase anon key only. The service
role key never appears in the app; anything needing it goes in an Edge Function.

**Commits.** Small, frequent, present tense, prefixed by type:
`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `style:`, `test:`.
Commit history frequency and quality are directly assessed. `main` must always hold the
latest working code.

---

## Design system: the hard rules

The source of truth is the Njam Design System artifact:
https://claude.ai/artifact/3gFmougXCaYTd2YWEP8VYy

That artifact is private to the author's Claude account and **cannot be opened from this
repo**. Its tokens are mirrored into `src/theme/tokens.ts`, which is the local source of
truth for code. If a value is needed that `tokens.ts` does not have, stop and say so.
Do not invent one.

1. **No raw values in screens or components.** Never type a hex code, a font size, a
   spacing number or a radius into a screen. Import from `src/theme/tokens.ts`.
2. **Both themes ship.** Paper (light) and Forest (dark) are equally supported. `action`
   flips from forest to lime between them, and `on-action` flips with it. Never hard-code
   either. Check a screen in dark before calling it done.
3. **No gradients in the product UI.** Every surface, fill, chip and button is a flat
   token. Gradients are fine in the pitch deck, mockups and promo art, never in the app.
4. **No pure white.** `surface` is warm paper in light, brand forest in dark.
5. **Radius signals role.** Chips and filled buttons are `pill`. Fields and outlined
   buttons are `md`. Cards and banners are `lg`. Sheets take `xl` on top corners only.
   The scanner frame is `xxl`. Never apply one radius across a whole screen.
6. **Borders, not shadows.** Use `line` for dividers and `lineStrong` for borders that
   carry meaning. Elevation exists in exactly three places: the verdict bottom sheet,
   modals, and the snackbar. A card never has a shadow. A button never has a shadow.
7. **Material Symbols Rounded only.** One icon family, no exceptions. Selection is shown
   by the FILL axis plus a colour change, never by swapping to a different icon. If
   Material Symbols lacks an icon, compose one from an existing icon plus a label.
8. **Verdict hues are verdict-only.** `verdictCaution` and `verdictUnsafe` never appear
   as layout colour, header backgrounds or decorative accents. The one sanctioned
   exception is allergy severity on a RuleChip.
9. **`accent` stays an accent.** Lime fills chips, the scan ring, progress and the centre
   tab circle. The only large lime area in the app is a Safe verdict fill. Never build a
   lime screen.
10. **Never set copy in `brandLimeDeep` or `accentQuiet`.** Both fall below 4.5:1 on
    surface and exist for decorative marks only.
11. **Touch targets.** Nothing tappable is under `layout.touchTargetMin` (48), including
    icon buttons that render at 24. Extend the hit area, do not grow the icon.
12. **Never tile or repeat the logo mark as a pattern.** The pill is the brand's pattern
    shape.

### The one rule with no exception

**A verdict is never carried by colour alone.** The shape mark, the word and the reason
line all carry it. The three verdict marks are drawn in house and must stay distinguishable
by silhouette: **circle = Safe, triangle = Caution, octagon = Not safe.** Never substitute
a Material Symbol for them inside a verdict component.

### Changes to the system itself need approval

If a change would affect the system rather than one screen (a colour, button size, the
type scale, spacing, radius, icon rules, a component's behaviour), do not make it. First
state plainly: what would change and which tokens, everywhere else it would surface, and
what it could break, especially contrast and touch targets. Then wait.

---

## Voice and copy

- Second person, to one person, about their food. "You have marked milk as severe", never
  "The user has an allergy to milk."
- Sentence case everywhere except `overline`, which is capitals. Product names keep the
  manufacturer's own casing.
- A verdict line is a fact plus a reason: "Not safe. Contains milk solids, which you
  marked severe."
- A caution line always says what is unknown: "We could not read the full ingredient list
  on this label."
- Never use emoji. Never use a sparkle or wand to mean the AI. When the AI did the reading,
  say so in words: "Read from the label photo, not yet verified."
- Numbers carry their unit and their comparison: "12.4 g carbs, over your 10 g limit."
- Buttons name the action, not the outcome: "Scan a barcode", "See alternatives". Never
  "Continue" where a specific verb exists.
- No em dashes. No "it's not X, it's Y". No checkmark bullets. No filler headlines.
- **"Safe" is reserved.** Never promise safety the engine cannot prove.

---

## The verdict engine

This is the heart of the app and the part most likely to be wrong in a way that matters.

- **Hybrid by design.** The AI _interprets_: ingredient to category, aliases, E-numbers,
  plain language. Deterministic code _decides_: numeric limits, hard allergen blocks.
- **On conflict, the rules engine wins.** Always.
- **An unverified AI-read record is capped at Caution. It can never be Safe.**
- **Zero false Safe verdicts** is a stated project target, measured against a 50-product
  regression suite. A false Caution is a nuisance; a false Safe is a health incident.
  When in doubt, the engine degrades toward Caution, never toward Safe.
- Target: a verdict in under 3 seconds.
- The scope pill is mandatory on the scanner. A scan run against the wrong household
  profile is the worst failure mode in the app.

---

## Screens (10)

Auth · Onboarding · Home/Search · Scanner · Verdict · Alternatives · Add a product ·
Profile & filters · Household · Admin review queue.

The brief requires a minimum of five; ten are planned. Each has a recipe in the design
system artifact.

## Roles

Household Owner · Standard User · Admin/Moderator.

## Profile layers (6)

Allergies with severity (required) · diet and faith · banned ingredients · E-numbers ·
nutrient limits · health presets.

## Database (10 tables)

`households` · `users` · `diet_profiles` · `profile_rules` · `scans` · `categories` ·
`products` · `nutrition_facts` · `product_ingredients` · `ingredients` · `allergens`.

`profile_rules` is deliberately generic — `type`, `target`, `operator`, `threshold` — so a
new rule category needs no migration. Keep it that way.

Row Level Security is on for every table from the first migration, not added later.
A user reads and writes only their own household's rows.

---

## Deadlines

- Progress Milestone (30%): weeks 12–14, live code review.
- Final application (60%): Wed 28 Oct 2026, 14:00. GitHub repo, public, with a full README
  and a 5–8 minute demonstration video.
