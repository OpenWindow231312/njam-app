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
| Products | `ProductTile`, `ProductGridCard`, `ProductCard` (row, identity), `PhotoStepCard` |
| People and scope | `Avatar`, `HouseholdBar`, `ScopePill` |
| Stores | `StoreLogo` (a shop's logo in a round white badge, storefront icon until one is uploaded) |
| Scanner | `ScanFrame` |
| Structure | `SectionHeader` (full, simple, shelf), `ListGroup` + `ListRow`, `StepProgress`, `TabBar`, `FrostedStrip` (v1.9: the frosted fade behind the status bar and the TabBar) |
| Feedback | `Snackbar`, `EmptyState`, `ConfirmDialog`, `LoadingMark` |
| AI | `NjamMark`, `AiAvatar`, `ChatBubble`, `ChatComposer` (with optional ghost text) |

`ProductGridCard` (13 Oct 2026, Home) is a white card for the two-column grid
on Home: photo with the verdict mark and save button, then the name, brand and
pack size. It stretches to its column; `ProductTile` keeps the shelf width.

Still to build: `BottomSheet` (the verdict sheet) and `NutrientMeter`, which the
design system describes but the canvas did not draw yet.

`ChatComposer` (12 Oct 2026, Ask Njam) can show ghost text: pass `ghost` and
`onChangeText`, and the likely rest of the message is drawn after what was typed
in `inkSubtle`, with a "Use the suggestion" button beside send. It is a Text
overlay behind a transparent TextInput, and hides itself when the two would
not fit on one line. Without those props the composer behaves as before.

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
