/**
 * VerdictChip: a verdict shrunk to a small pill, for places where many
 * verdicts sit together: search results, scan history, alternatives, and the
 * scope pill on the camera.
 *
 * Mark and word always appear together. The word is never dropped, even here,
 * because the shape and the word are what a colour-blind person reads.
 * "Check" is the only abbreviation in the system: "Caution" does not fit.
 *
 * Only the filled treatment exists for now. The outlined treatment in the
 * design system needs verdict marks drawn for a plain background, which the
 * system does not have yet (see the PR notes).
 */
import { StyleSheet, Text, View } from 'react-native';

import { VerdictMark, type VerdictState } from '@/components/design-system/VerdictMark';
import { icon, layout, radius, space, typography } from '@/theme/tokens';
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
};

export function VerdictChip({ state, memberName }: VerdictChipProps) {
  const { colors } = useNjamTheme();

  const look = {
    safe: { fill: colors.verdictSafe, ink: colors.onAccent },
    caution: { fill: colors.verdictCaution, ink: colors.onVerdictCaution },
    unsafe: { fill: colors.verdictUnsafe, ink: colors.onVerdictUnsafe },
  }[state];

  const word = memberName ? `${words[state]} for ${memberName}` : words[state];
  const spoken = memberName ? `${spokenWords[state]} for ${memberName}` : spokenWords[state];

  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={[styles.chip, { backgroundColor: look.fill }]}>
      <VerdictMark state={state} size={icon.sizeXs} />
      <Text style={[typography.buttonS, { color: look.ink }]}>{word}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
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
