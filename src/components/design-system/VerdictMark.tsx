/**
 * VerdictMark: the three in-house verdict shapes.
 *
 * Circle = Safe, triangle = Caution, octagon = Not safe. They are drawn here
 * rather than taken from Material Symbols because a verdict has to be readable
 * by shape alone: in greyscale, with colour blindness, or on a cracked screen.
 * Material's check_circle, warning and dangerous all look like round blobs
 * at small sizes.
 *
 * Each mark is drawn to sit on its own verdict fill (the lime, ochre or brick
 * of a VerdictBanner or VerdictChip). Only use it inside VerdictBanner,
 * VerdictChip and ProductCard.
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
  /** Rendered size. Pass a value from the icon tokens, e.g. icon.sizeLg. */
  size: number;
};

export function VerdictMark({ state, size }: VerdictMarkProps) {
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

  if (state === 'caution') {
    // Dark triangle with an exclamation cut in the caution colour.
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" {...hidden}>
        <Path
          d="M24 6 44 40 4 40Z"
          fill={colors.onVerdictCaution}
          stroke={colors.onVerdictCaution}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <Rect x={21.4} y={17} width={5.2} height={12} rx={2.6} fill={colors.verdictCaution} />
        <Circle cx={24} cy={34} r={2.8} fill={colors.verdictCaution} />
      </Svg>
    );
  }

  // Not safe: light octagon with a horizontal bar, like a no-entry sign.
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" {...hidden}>
      <Path
        d="M44.3 15.6 32.4 3.7H15.6L3.7 15.6v16.8l11.9 11.9h16.8l11.9-11.9Z"
        fill={colors.onVerdictUnsafe}
        stroke={colors.onVerdictUnsafe}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Rect x={12.5} y={21.4} width={23} height={5.2} rx={2.6} fill={colors.verdictUnsafe} />
    </Svg>
  );
}
