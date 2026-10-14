# Onboarding

The first-run flow that builds a usable diet profile before the first scan. A
scan against an empty profile is close to useless, so onboarding earns its place.

## How it works

- Straight after sign-up, the root layout (`src/app/_layout.tsx`) only lets a
  signed-in person reach `onboarding` until they finish it. Finishing sets
  `onboarded: true` in the auth user's metadata (`AuthProvider.finishOnboarding`),
  which needs no migration. The flag only decides which screen opens first; it
  grants nothing.
- Two steps, then a ready screen:
  1. **Allergies and diets** (required: pick some, or "None of these"). A new
     allergy starts as Severe; "Avoid" is stored with no severity. A diet is a
     shortcut for the allergens it rules out (gluten-free is gluten, dairy-free
     is milk, egg-free is egg, nut-free is peanuts and tree nuts) and is saved
     as those allergen rules, so the engine checks it with the same aliases.
  2. **Anything else you avoid**: ingredients and E-numbers on one screen.
     Suggestions are names the catalogue already knows; anything else can be
     typed (E-numbers are checked against `E` plus three or four digits and an
     optional letter).
  3. **Your profile is ready**: the saved rules (`RuleGroups`, shared with
     Profile), "Go to Home" and "Change my rules".
- Nothing is saved until the end of step 2. `my-rules.ts` writes the new
  `profile_rules` rows first and only then deletes the old ones, so a failed
  save can never leave you with fewer allergies than before.
- Rules of any other type on the profile (nutrient limits) are left alone.
- The same screen opens from Profile as `edit-rules`, filled with your saved
  rules, without the ready screen.

## Still to come

- **Vegetarian, vegan, halal.** The engine needs to know what each ingredient
  comes from (meat, pork, alcohol). Planned as tags on `ingredients` (a schema
  change), with an untagged ingredient giving Caution, never Safe.
- **Nutrient limits and health presets**, once the engine reads nutrition facts.
