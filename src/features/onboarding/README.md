# Onboarding

The first-run flow that builds a usable diet profile before the first scan. A
scan against an empty profile is close to useless, so onboarding earns its place.

## How it works

- Straight after sign-up, the root layout (`src/app/_layout.tsx`) only lets a
  signed-in person reach `onboarding` until they finish it. Finishing sets
  `onboarded: true` in the auth user's metadata (`AuthProvider.finishOnboarding`),
  which needs no migration. The flag only decides which screen opens first; it
  grants nothing.
- Three steps, all rule types the verdict engine can check today:
  1. **Allergies** with severity (required: pick some, or "I have no food
     allergies"). A new allergy starts as Severe. "Avoid" is stored with no
     severity.
  2. **Ingredients you avoid**: suggestions the catalogue already knows, or type
     your own.
  3. **E-numbers you avoid**: suggestions, or type one (checked against
     `E` plus three or four digits and an optional letter).
- Nothing is saved until the last step. `my-rules.ts` writes the new
  `profile_rules` rows first and only then deletes the old ones, so a failed
  save can never leave you with fewer allergies than before.
- Rules of any other type on the profile (nutrient limits, diets) are left alone.
- The same screen opens from Profile as `edit-rules`, filled with your saved rules.

## Still to come

Diet and faith, nutrient limits and health presets. The engine cannot check
those yet, so adding them now would turn every scan into Caution.
