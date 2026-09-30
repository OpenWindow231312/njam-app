/**
 * VerdictMark: the three in-house verdict shapes.
 *
 * Circle = Safe, triangle = Caution, octagon = Not safe. They are drawn here
 * rather than taken from Material Symbols because a verdict has to be readable
 * by shape alone: in greyscale, with colour blindness, or on a cracked screen.
 * Material's check_circle, warning and dangerous all look like round blobs
 * at small sizes.
 *
 * Two grounds (v1.5, the "verdict dots" board on the canvas):
 *   fill    - the mark sits on its own verdict fill, the lime, orange or red
 *             of a VerdictBanner strip or a filled VerdictChip. Caution and
 *             Not safe are drawn in the fill's ink so they read on it.
 *   surface - the mark stands alone on white or the pale ground: product
 *             tiles, result rows, avatars, filter chips, verdict lines.
 *             Caution and Not safe carry their own colour here.
 * Safe looks the same on both: a forest circle with a lime tick.
 *
 * Sizes on their own come from icon.markXs / markSm / markMd / markLg
 * (16, 20, 28, 36). Only use the mark where a verdict is shown, and always
 * with the verdict word or a reason line nearby.
 *
 * The numbers inside the SVGs are drawing coordinates in a 48 x 48 box, copied
 * from the design system's verdict assets. They are geometry, not layout
 * values, so they are not tokens.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useNjamTheme } from '@/theme/use-njam-theme';

export type VerdictState = 'safe' | 'caution' | 'unsafe';

type VerdictMarkProps = {
  state: VerdictState;
  /** Rendered size. Pass a value from the icon tokens, e.g. icon.markLg. */
  size: number;
  /** What the mark sits on. Defaults to its own verdict fill. */
  ground?: 'fill' | 'surface';
};

export function VerdictMark({ state, size, ground = 'fill' }: VerdictMarkProps) {
  const { colors } = useNjamTheme();

  // The word next to the mark already says the verdict, so screen readers
  // skip the mark instead of announcing it twice.
  const hidden = {
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants' as const,
  };

  if (state === 'safe') {
    // Forest circle with a lime tick.
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" {...hidden}>
        <Circle cx={24} cy={24} r={21} fill={colors.brandForest} />
        <Path
          d="M14.5 24.5 21 31 33.5 18.5"
          fill="none"
          stroke={colors.verdictSafe}
          strokeWidth={4.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  // On its fill, the shape takes the fill's ink and the cut-out takes the
  // fill colour. On a surface the two swap, so the shape carries the colour.
  const onSurface = ground === 'surface';

  if (state === 'caution') {
    // Triangle with an exclamation cut.
    const shape = onSurface ? colors.verdictCaution : colors.onVerdictCaution;
    const cut = onSurface ? colors.onVerdictCaution : colors.verdictCaution;
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" {...hidden}>
        <Path d="M24 6 44 40 4 40Z" fill={shape} stroke={shape} strokeWidth={6} strokeLinejoin="round" />
        <Rect x={21.4} y={17} width={5.2} height={12} rx={2.6} fill={cut} />
        <Circle cx={24} cy={34} r={2.8} fill={cut} />
      </Svg>
    );
  }

  // Not safe: octagon with a horizontal bar, like a no-entry sign.
  const shape = onSurface ? colors.verdictUnsafe : colors.onVerdictUnsafe;
  const cut = onSurface ? colors.onVerdictUnsafe : colors.verdictUnsafe;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" {...hidden}>
      <Path
        d="M44.3 15.6 32.4 3.7H15.6L3.7 15.6v16.8l11.9 11.9h16.8l11.9-11.9Z"
        fill={shape}
        stroke={shape}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Rect x={12.5} y={21.4} width={23} height={5.2} rx={2.6} fill={cut} />
    </Svg>
  );
}
