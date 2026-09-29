/**
 * SectionHeader: the headline at the top of every screen that is not the camera.
 *
 * Variants (from the design system SectionHeader card):
 *   full   - optional step numeral and tag row, a displayL headline, and a
 *            deck (standfirst) below it. The top of Home and onboarding.
 *   simple - headline only, in displayM. Section breaks inside a screen.
 *
 * Only one displayL per screen. The step and tag row is for onboarding only.
 * Headlines are questions or statements, never labels:
 * "What can you not eat?" rather than "Dietary restrictions".
 */
import { StyleSheet, Text, View } from 'react-native';

import { icon, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type SectionHeaderProps = {
  headline: string;
  variant?: 'full' | 'simple';
  /** The reassurance line under the headline, e.g. "You can change any of it later." */
  deck?: string;
  /** Onboarding only: the current step number. */
  step?: number;
  /** Onboarding only: total number of steps, used for the screen reader label. */
  totalSteps?: number;
  /** Onboarding only: the short tag beside the step, e.g. "Your rules". */
  tag?: string;
};

export function SectionHeader({
  headline,
  variant = 'full',
  deck,
  step,
  totalSteps,
  tag,
}: SectionHeaderProps) {
  const { colors } = useNjamTheme();
  const isFull = variant === 'full';
  const showTagRow = isFull && (step !== undefined || tag);

  // Read the step as part of the header: "Step 2 of 6, Your rules. What can you not eat?"
  const stepLabel =
    step !== undefined ? `Step ${step}${totalSteps ? ` of ${totalSteps}` : ''}` : undefined;
  const accessibleLabel = [stepLabel, tag, headline].filter(Boolean).join(', ');

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={accessibleLabel}
      style={[styles.container, isFull && { marginBottom: space.s7 }]}>
      {showTagRow && (
        <View style={styles.tagRow}>
          {step !== undefined && (
            <View style={[styles.stepCircle, { backgroundColor: colors.action }]}>
              <Text style={[typography.label, { color: colors.onAction }]}>{step}</Text>
            </View>
          )}
          {tag && (
            <View style={[styles.tag, { backgroundColor: colors.accent }]}>
              <Text style={[typography.overline, { color: colors.onAccent }]}>{tag}</Text>
            </View>
          )}
        </View>
      )}

      <Text style={[isFull ? typography.displayL : typography.displayM, { color: colors.ink }]}>
        {headline}
      </Text>

      {isFull && deck && (
        <Text style={[typography.body, { color: colors.inkMuted }]}>{deck}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.s3,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  stepCircle: {
    width: icon.sizeMd,
    height: icon.sizeMd,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    borderRadius: radius.pill,
    paddingHorizontal: space.s3,
    paddingVertical: space.s1,
  },
});
