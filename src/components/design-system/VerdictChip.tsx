/**
 * VerdictChip: a verdict shrunk to a small pill, for places where many
 * verdicts sit together: search results, scan history, alternatives, and the
 * scope pill on the camera.
 *
 * Mark and word always appear together. The word is never dropped, even here,
 * because the shape and the word are what a colour-blind person reads.
 * "Check" is the only abbreviation in the system: "Caution" does not fit.
 *
 * Two treatments, one per list:
 *   filled   - the default: the verdict fill with its mark.
 *   outlined - transparent with a lineStrong edge, the word in the verdict's
 *              ink and the surface version of the mark. For a list where
 *              every row is Safe and the fills would become wallpaper.
 */
import { StyleSheet, Text, View } from 'react-native';

import { VerdictMark, type VerdictState } from '@/components/design-system/VerdictMark';
import { border, icon, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

const words: Record<VerdictState, string> = {
  safe: 'Safe',
  caution: 'Check',
  unsafe: 'Not safe',
};

// What a screen reader says. "Check" is only a space-saver on screen.
const spokenWords: Record<VerdictState, string> = {
  safe: 'Safe',
  caution: 'Caution',
  unsafe: 'Not safe',
};

type VerdictChipProps = {
  state: VerdictState;
  /** On the camera scope pill: whose profile the verdict is for. */
  memberName?: string;
  variant?: 'filled' | 'outlined';
};

export function VerdictChip({ state, memberName, variant = 'filled' }: VerdictChipProps) {
  const { colors } = useNjamTheme();
  const outlined = variant === 'outlined';

  const look = {
    safe: { fill: colors.verdictSafe, ink: colors.onAccent, outlineInk: colors.verdictSafeInk },
    caution: { fill: colors.verdictCaution, ink: colors.onVerdictCaution, outlineInk: colors.verdictCautionInk },
    unsafe: { fill: colors.verdictUnsafe, ink: colors.onVerdictUnsafe, outlineInk: colors.verdictUnsafeInk },
  }[state];

  const word = memberName ? `${words[state]} for ${memberName}` : words[state];
  const spoken = memberName ? `${spokenWords[state]} for ${memberName}` : spokenWords[state];

  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={[
        styles.chip,
        outlined
          ? { borderWidth: border.hairline, borderColor: colors.lineStrong }
          : { backgroundColor: look.fill },
      ]}>
      <VerdictMark state={state} size={icon.sizeXs} ground={outlined ? 'surface' : 'fill'} />
      <Text style={[typography.buttonS, { color: outlined ? look.outlineInk : look.ink }]}>{word}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    // Never squeezed by a long product name beside it in a row.
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    minHeight: layout.chipHeight,
    // Equal padding both sides (Anika's canvas edit, v1.3).
    paddingLeft: layout.chipPaddingStart,
    paddingRight: layout.chipPaddingEnd,
    borderRadius: radius.pill,
  },
});
