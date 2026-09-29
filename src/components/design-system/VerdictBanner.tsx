/**
 * VerdictBanner: the full-width verdict at the top of the verdict sheet.
 * The thing the whole app exists to show.
 *
 * Three states and only three. A failed lookup is not a verdict; it is a
 * Snackbar with a retry. Each state is carried three ways at once: the mark's
 * shape, the headline word, and the reason lines. Never by colour alone.
 *
 * Rules from the verdict system foundation:
 *   - 1 to 5 reasons, worst first.
 *   - Not safe is never softened. No "unfortunately", no apology.
 *   - The banner never animates in. It appears.
 *   - No dismiss control. The sheet dismisses; the verdict does not.
 *
 * Reason icons: "no_food" allergen or banned ingredient, "science" E-number,
 * "nutrition" nutrient limit, "restaurant" diet or faith rule, "task_alt" a
 * passing Safe.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { VerdictMark, type VerdictState } from '@/components/design-system/VerdictMark';
import { icon, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

export type VerdictReason = {
  /** Material Symbols ligature, see the list above. */
  icon: string;
  /** One line, a fact plus a reason: "Contains milk solids. You marked milk severe." */
  text: string;
};

type VerdictBannerProps = {
  state: VerdictState;
  /** e.g. "Not safe for Anika", "Check this one", "Safe for everyone". */
  headline: string;
  reasons: VerdictReason[];
  /** e.g. "Checked against 6 rules in your profile." or "Read from the label photo, not yet verified." */
  sourceNote?: string;
  /** Used for the screen reader announcement only. */
  productName?: string;
};

const MAX_REASONS = 5;

const stateWords: Record<VerdictState, string> = {
  safe: 'Safe',
  caution: 'Caution',
  unsafe: 'Not safe',
};

export function VerdictBanner({ state, headline, reasons, sourceNote, productName }: VerdictBannerProps) {
  const { colors } = useNjamTheme();

  if (__DEV__ && (reasons.length === 0 || reasons.length > MAX_REASONS)) {
    console.warn(`VerdictBanner needs 1 to ${MAX_REASONS} reasons, got ${reasons.length}.`);
  }
  const shownReasons = reasons.slice(0, MAX_REASONS);

  const look = {
    safe: { fill: colors.verdictSafe, ink: colors.onAccent },
    caution: { fill: colors.verdictCaution, ink: colors.onVerdictCaution },
    unsafe: { fill: colors.verdictUnsafe, ink: colors.onVerdictUnsafe },
  }[state];

  // Announced as one block: state, product, headline, reason count.
  // e.g. "Not safe. Ouma Rusks Buttermilk. Not safe for Anika. 2 reasons."
  const count = shownReasons.length;
  const announcement = [
    stateWords[state],
    productName,
    headline,
    `${count} ${count === 1 ? 'reason' : 'reasons'}`,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <View
      accessible
      accessibilityLabel={announcement}
      style={[styles.banner, { backgroundColor: look.fill }]}>
      <VerdictMark state={state} size={icon.sizeLg} />

      <View style={styles.body}>
        <Text style={[typography.displayM, { color: look.ink }]}>{headline}</Text>

        <View style={styles.reasons}>
          {shownReasons.map((reason) => (
            <View key={reason.text} style={styles.reasonRow}>
              <Icon name={reason.icon} size="sm" color={look.ink} />
              <Text style={[typography.bodyL, styles.reasonText, { color: look.ink }]}>
                {reason.text}
              </Text>
            </View>
          ))}
        </View>

        {sourceNote && (
          <View style={styles.noteRow}>
            <Icon name="info" size="sm" color={look.ink} />
            <Text style={[typography.caption, styles.reasonText, { color: look.ink }]}>
              {sourceNote}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s4,
    padding: space.s4,
    borderRadius: radius.lg,
  },
  body: {
    flex: 1,
    gap: space.s2,
  },
  reasons: {
    gap: space.s1,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s2,
  },
  reasonText: {
    flex: 1,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    marginTop: space.s1,
  },
});
