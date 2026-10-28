# Onboarding

The first-run flow that builds a usable diet profile before the first scan. A
scan against an empty profile is close to useless, so onboarding earns its place.

## How it works

- Straight after sign-up, the root layout (`src/app/_layout.tsx`) only lets a
  signed-in person reach `onboarding` until they finish it. Finishing sets
  `onboarded: true` in the auth user's metadata (`AuthProvider.finishOnboarding`),
  which needs no migration. The flag only decides which screen opens first; it
  grants nothing.
- Four steps, one question each, then a ready screen. Every chosen thing
  becomes a forest RuleChip, and tapping it opens the same sheet again to
  change or remove it. The buttons stay pinned to the bottom (Screen's `footer`).
  1. **Allergies** (required: pick some, or "I have no allergies"). Tapping an
     allergen adds it as Severe, the safer guess, and opens `LevelSheet` with
     the three levels and what each one does. Tapping a level saves it and
     closes the sheet. "Avoid" is stored with no severity. The words match the
     engine: Avoid and Moderate are checked the same way, and Severe also makes
     a "may contain" line Not safe, because even a trace counts, which a card
     under the chips says in your own words.
  2. **Diet and faith** (optional): vegetarian, vegan, halaal, kosher.
     Tapping one opens `DietSheet`, listing what it rules out, all ticked; you
     untick what you are fine with. See "How a diet is saved" below.
  3. **Anything else you avoid** (optional): ingredients and E-numbers.
     Suggestions are names the catalogue already knows; anything else can be
     typed (E-numbers are checked against `E` plus three or four digits and an
     optional letter).
  4. **Nutrient limits** (optional): a most per 100 g for sugar, sodium,
     saturated fat, fat or carbs, set in `LimitSheet` with a Slider and quick
     picks for the usual "low" and "high" amounts. Health presets (Low sugar,
     Low salt, Low fat, Heart health) set a few limits in one tap.
  5. **Your rules are ready**: your rules as chips, grouped by step. Tapping a
     chip goes back to its step. "Go to Home" and "Change my rules" sit at the
     bottom.
- **How a diet is saved.** The engine cannot check "halaal" as such (that
  needs every ingredient tagged with where it comes from). So a diet is the
  list of things it rules out (`DIET_PRESETS` in `rule-options.ts`), saved as
  ordinary ingredient, E-number and allergen rules the engine already checks,
  plus one `diet` row per ticked thing ("halaal/gelatine") so the app knows
  what you ticked. The engine skips `diet` rows. An allergen a diet adds is
  "Avoid" and never lowers a level you set yourself. The sheet says plainly
  what an ingredient list cannot tell you: how meat was slaughtered, or a
  certificate.
- On a new account the catalogue starts downloading as soon as onboarding
  opens (`warmCatalogue` in `use-catalogue.ts`), so Home usually has its
  products by the time you get there.
- Nothing is saved until the end of step 4. `my-rules.ts` writes the new
  `profile_rules` rows first and only then deletes the old ones, so a failed
  save can never leave you with fewer allergies than before.
- Rules of any other type on the profile (a nutrient minimum) are left alone.
- The same screen opens from Profile as `edit-rules`, filled with your saved
  rules, without the ready screen.

## Still to come

- **Diets checked properly.** Today a diet is a list of words. A vague word
  like "flavouring" can still hide an animal ingredient. Planned as tags on
  `ingredients` saying what each comes from (a schema change), with an
  untagged ingredient giving Caution, never Safe.
