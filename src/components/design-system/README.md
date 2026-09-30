# Design-system components

Reusable UI, built only from `src/theme/tokens.ts`. No screen should reinvent a
button, a chip or a card. Every component here imports its colours, type,
spacing, radius and icons from tokens, and ships in both themes (Paper and
Forest).

Built so far (v1.5, 30 Sep 2026, from the "Njam UI v1.4" canvas):

| Group | Components |
| --- | --- |
| Actions | `Button` (primary, secondary, tonal, outlined, text, danger; small, default, large), `IconButton` (standard, tonal, filled, outlined, raised) |
| Choices | `OptionButton`, `RuleChip`, `FilterChip`, `DropdownChip`, `SegmentedControl`, `Checkbox`, `Slider` |
| Fields | `TextField` (outlined, search, numeric) |
| Verdict | `VerdictMark` (fill and surface grounds), `VerdictChip` (filled, outlined), `VerdictBanner`, `MemberVerdict` |
| Products | `ProductTile`, `ProductCard` (row, identity), `PhotoStepCard` |
| People and scope | `Avatar`, `HouseholdBar`, `ScopePill` |
| Scanner | `ScanFrame` |
| Structure | `SectionHeader` (full, simple, shelf), `ListGroup` + `ListRow`, `StepProgress`, `TabBar` |
| Feedback | `Snackbar`, `EmptyState`, `ConfirmDialog`, `LoadingMark` |
| AI | `NjamMark`, `AiAvatar`, `ChatBubble`, `ChatComposer` |

Still to build: `BottomSheet` (the verdict sheet) and `NutrientMeter`, which the
design system describes but the canvas did not draw yet.

Every one of them is on the preview screen (`src/app/explore.tsx`).

How they behave (v1.6, 30 Sep 2026):

- **Icons** are SVG paths copied out of the Material Symbols Rounded font
  (`icon-paths.ts`, built by `scripts/build-icons.py`), so they sit exactly
  centred on every platform. To add an icon, add its name to the script and
  rerun it.
- **Presses** all go through `PressableSurface`: the pressed wash eases in over
  120ms and buttons, chips and cards shrink very slightly; rows and checkboxes
  only darken. Reduce motion turns the shrink off.
- **Haptics** are for good news only: `hapticSuccess()` in `src/lib/haptics.ts`,
  called by a neutral Snackbar and, later, by the scanner when a scan succeeds.

Hard rules that apply to everything in this folder live in `CLAUDE.md` under
"Design system: the hard rules". The one with no exception: a verdict is never
carried by colour alone.
