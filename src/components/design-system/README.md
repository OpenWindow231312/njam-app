# Design-system components

Reusable UI, built only from `src/theme/tokens.ts`. No screen should reinvent a
button, a chip or a card. Every component here imports its colours, type,
spacing, radius and icons from tokens, and ships in both themes (Paper and
Forest).

Planned components (from the design system):

- `Button` (filled `pill`, outlined `md`, tonal, text)
- `Chip` and `RuleChip` (severity is the one sanctioned verdict-hue exception)
- `SectionHeader`
- `ProductCard`, `ListRow`
- `NutrientMeter`
- `ScanFrame` (radius `xxl`, the scope pill lives with it)
- `VerdictMark` (circle = Safe, triangle = Caution, octagon = Not safe; drawn in
  house, never a Material Symbol)
- `BottomSheet`, `Modal`, `Snackbar` (the only three places elevation exists)
- `TabBar` (Material Symbols Rounded, FILL axis for selection)

Hard rules that apply to everything in this folder live in `CLAUDE.md` under
"Design system: the hard rules". The one with no exception: a verdict is never
carried by colour alone.
