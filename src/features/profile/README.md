# Profile & filters

View and edit the diet profile the scanner checks against: the six layers set up
in onboarding, changeable any time.

- Reads and writes `diet_profiles` and `profile_rules`.
- Allergy severity is shown on a `RuleChip` (the one sanctioned use of a verdict
  hue outside a verdict).
- Nutrient limits carry their unit and comparison: "over your 10 g limit".
- A household may hold several profiles (a child, a guest); this screen edits the
  selected one.

Built so far (18 Oct 2026, from the Figma "Settings C" design): Profile is
your name and role, then three tabs on a SegmentedControl.

- **Rules** (`RulesTab`): your rules as RuleChips. Tap one to change an
  allergy's level or remove it; "Add a rule" searches allergies, diets,
  ingredients and E-numbers. Both happen in one `RuleSheet`. An allergy's
  level uses `SeverityPicker` (in `features/onboarding`, shared with
  onboarding), with an info button that says what each level means. Remove
  asks "Remove gelatin?" in the same sheet before it saves; it is the primary
  button when it is the only action (ingredients, E-numbers) and a text button
  under Save on an allergy. Saving uses
  `saveMyRules`, the same save as onboarding. Nutrient limits and health
  presets show as "Coming soon": the engine cannot check them yet, and a rule
  it cannot check would turn every scan into Caution. The same tab edits the
  rules of someone without a phone (`app/person-rules.tsx`).
- **Household**: see `src/features/household`.
- **Settings** (`SettingsTab`): scanning, notifications, privacy and display,
  then Delete my account and Log out. Phone settings (flashlight, vibration)
  live in `src/lib/device-settings.ts`; account settings (notifications,
  scan history) in the `user_settings` table (`account-settings.ts`).
  "Download my data" and "Delete my account" are in `my-data.ts`; deleting
  goes through the `delete-account` Edge Function.

`SettingsCard` is the white card all three tabs use: a header, then rows.
