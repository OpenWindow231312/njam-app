/**
 * VerdictBanner: the verdict at the top of the verdict sheet.
 * The thing the whole app exists to show.
 *
 * Layout (design system v1.3, card edge v1.5): a header strip in the verdict
 * colour carries the mark, the headline and the product name. The reasons sit
 * below it on a white card with the soft ambient shadow (no outline), each
 * icon in a round badge, so they are easy to read while the colour stays the
 * loudest thing on screen.
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
import { border, icon, layout, radius, space, typography } from '@/theme/tokens';
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
  /** Shown under the headline in the strip, and read out first by screen readers. */
  productName?: string;
};

const MAX_REASONS = 5;

const stateWords: Record<VerdictState, string> = {
  safe: 'Safe',
  caution: 'Caution',
  unsafe: 'Not safe',
};

export function VerdictBanner({ state, headline, reasons, sourceNote, productName }: VerdictBannerProps) {
  const { colors, shadows } = useNjamTheme();

  if (__DEV__ && (reasons.length === 0 || reasons.length > MAX_REASONS)) {
    console.warn(`VerdictBanner needs 1 to ${MAX_REASONS} reasons, got ${reasons.length}.`);
  }
  const shownReasons = reasons.slice(0, MAX_REASONS);

  // The strip uses the saturated fill; reason icons use the darker -ink
  // version of the same hue, which stays readable on the near-white card.
  const look = {
    safe: { fill: colors.verdictSafe, ink: colors.onAccent, reasonInk: colors.verdictSafeInk },
    caution: { fill: colors.verdictCaution, ink: colors.onVerdictCaution, reasonInk: colors.verdictCautionInk },
    unsafe: { fill: colors.verdictUnsafe, ink: colors.onVerdictUnsafe, reasonInk: colors.verdictUnsafeInk },
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
    // Outer view: the shadow. Inner view: clips the strip to the rounded
    // corners (iOS cannot clip and cast a shadow on the same view).
    <View
      accessible
      accessibilityLabel={announcement}
      style={[styles.card, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <View style={styles.clip}>
        {/* Header strip: the verdict itself. */}
        <View style={[styles.strip, { backgroundColor: look.fill }]}>
          <VerdictMark state={state} size={icon.markLg} />
          <View style={styles.stripText}>
            <Text style={[typography.displayS, { color: look.ink }]}>{headline}</Text>
            {productName && <Text style={[typography.bodyS, { color: look.ink }]}>{productName}</Text>}
          </View>
        </View>

        {/* Why: one row per reason, then the source note. */}
        <View style={styles.body}>
          {shownReasons.map((reason) => (
            <View key={reason.text} style={styles.reasonRow}>
              <View style={[styles.badge, { backgroundColor: colors.surfaceSunken }]}>
                <Icon name={reason.icon} size="sm" color={look.reasonInk} />
              </View>
              <Text style={[typography.bodyL, styles.reasonText, { color: colors.ink }]}>{reason.text}</Text>
            </View>
          ))}

          {sourceNote && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.line }]} />
              <View style={styles.noteRow}>
                <Icon name="info" size="sm" color={colors.inkMuted} />
                <Text style={[typography.caption, styles.reasonText, { color: colors.inkMuted }]}>
                  {sourceNote}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
  },
  clip: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
  },
  stripText: {
    flex: 1,
  },
  body: {
    padding: space.s4,
    gap: space.s3,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  badge: {
    width: layout.iconBadgeSize,
    height: layout.iconBadgeSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: {
    flex: 1,
  },
  divider: {
    height: border.hairline,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
});
