# Onboarding

The first-run flow that builds a usable diet profile before the first scan. A
scan against an empty profile is close to useless, so onboarding earns its place.

- Walks through the six profile layers: allergies with severity (required), diet
  and faith, banned ingredients, E-numbers, nutrient limits, health presets.
- Writes to `diet_profiles` and `profile_rules` (the generic
  type/target/operator/threshold table).
- Hero panel uses `surfaceInverse` and radius `xxl`; progress uses `accent`.
- Explanations say what a rule will do in plain second-person language.
