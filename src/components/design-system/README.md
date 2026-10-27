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
| Products | `CategoryBubble`, `ProductTile`, `ProductGridCard`, `ProductCard` (row, identity), `PhotoStepCard` |
| People and scope | `Avatar`, `HouseholdBar`, `ScopePill` |
| Stores | `StoreLogo` (a shop's square logo filling a round badge, storefront icon until one is uploaded) |
| Scanner | `ScanFrame` (close, type the barcode, torch, brackets, hint, scan line), `ShutterButton` (ready, busy), `CameraMessage` (the one message card on the camera) |
| Structure | `SectionHeader` (full, simple, shelf), `ListGroup` + `ListRow`, `StepProgress`, `TabBar`, `TopBar` (27 Oct 2026: pinned, solid, back button always in one place; a line and a small title appear once you scroll), `FrostedStrip` (v1.9: the frosted fade behind the status bar and the TabBar) |
| Feedback | `Snackbar`, `EmptyState`, `ConfirmDialog`, `BottomSheet`, `LoadingMark` |
| AI | `NjamMark`, `AiAvatar`, `ChatBubble`, `ChatComposer` (with optional ghost text) |

`ProductGridCard` (13 Oct 2026, Home; option E on 26 Oct 2026) is the one
white card for a product, on every shelf and grid: a 180 tall photo with the
verdict mark lower left and a round save button upper right (white, or forest
with a lime bookmark once saved), then the brand as an overline, the name and
the pack size. It stretches to its column; `ProductTile` is the same card at
the shelf width.

`CategoryBubble` (13 Oct 2026) is an aisle as a round icon with its name under
it, like Sixty60's quick shops: white with the ambient shadow at rest, lime when
it is the aisle on show. `layout.categoryBubbleSize` (64) sets the circle.

`BottomSheet` (18 Oct 2026, Profile) rises from the bottom over the scrim:
white, xl top corners, the sheet shadow, a title with a close button, a body
that scrolls past `layout.sheetMaxHeight`, and a footer for its buttons.

Still to build: `NutrientMeter`, which the design system describes but the
canvas did not draw yet.

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
