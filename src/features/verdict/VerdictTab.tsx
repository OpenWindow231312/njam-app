/**
 * VerdictTab: the verdict-coloured tab that peeks out above the paper drawer
 * on the Verdict screen. "Not safe for Thabo", with the shape mark.
 *
 * It carries the mark, the word and who it is for, so the verdict is never
 * colour alone. It stays put while the drawer scrolls: at rest the label
 * shows; once you scroll, the drawer slides up over the label and only a
 * strip of the colour stays visible above it.
 *
 * The tab fills the space it is given. The drawer covers everything below
 * TAB_PEEK_AT_REST, so only the top of it is ever seen.
 */
import { StyleSheet, Text, View } from 'react-native';

import { VerdictMark } from '@/components/design-system';
import type { VerdictState } from '@/services/verdict';
import { icon, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/** How much of the tab shows at rest: its top padding, the label line, and room under it. */
export const TAB_PEEK_AT_REST = space.s6 + typography.title.lineHeight + space.s5;

/** How much of the tab still shows once the drawer has slid up over the label. */
export const TAB_PEEK_SCROLLED = space.s6;

/** How far the drawer slides up before it stops: the label line and the room under it. */
export const DRAWER_TRAVEL = TAB_PEEK_AT_REST - TAB_PEEK_SCROLLED;

type VerdictTabProps = {
  state: VerdictState;
  /** "Not safe for Thabo". */
  label: string;
  /** Read out after the label, e.g. "Breaks 1 of your 5 rules". */
  summary: string;
};

export function VerdictTab({ state, label, summary }: VerdictTabProps) {
  const { colors, shadows } = useNjamTheme();
  // Each fill with the ink that reads on it.
  const look = {
    safe: { fill: colors.verdictSafe, ink: colors.onAccent },
    caution: { fill: colors.verdictCaution, ink: colors.onVerdictCaution },
    unsafe: { fill: colors.verdictUnsafe, ink: colors.onVerdictUnsafe },
  }[state];

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${label}. ${summary}.`}
      style={[styles.tab, shadows.floating, { backgroundColor: look.fill }]}>
      <View style={styles.label}>
        <VerdictMark state={state} size={icon.markSm} ground="fill" />
        <Text style={[typography.title, { color: look.ink }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    paddingTop: space.s6,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
});
