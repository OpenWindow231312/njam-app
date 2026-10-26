/**
 * RulesCard: "Thabo's rules", one row per rule in the profile and what the
 * label showed for it.
 *
 *   broken    - the verdict mark (octagon), the rule, and what broke it in
 *               the not-safe ink: "Wheat · severe / Contains whole wheat".
 *   unchecked - the caution triangle and what we could not tell.
 *   met       - a plain tick, the rule, and "Not listed". Never the word safe.
 *
 * The summary under the title says it in plain words ("Breaks 1 of your 3
 * rules"), never "2 of 2 rules met", which a person in our user test read as
 * a contradiction next to a Caution verdict.
 *
 * Closed, the card shows only the rules that were broken or could not be
 * checked, so the reason for the verdict is visible without a tap. Open, it
 * also lists every rule that was kept. When every rule was a problem there
 * is nothing more to open, so it has no chevron.
 *
 * A past scan only kept its reason lines, not one row per rule, so it uses
 * PastRulesCard instead.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, VerdictMark, type VerdictReason } from '@/components/design-system';
import { CardHeader } from '@/features/verdict/CardHeader';
import type { RuleCheck, VerdictState } from '@/services/verdict';
import { border, icon, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/** "your rule" for one, "1 of your 3 rules" otherwise. */
function ofYourRules(count: number, total: number): string {
  return total === 1 ? 'your rule' : `${count} of your ${total} rules`;
}

/**
 * The line under the title, which also goes on the verdict tab for a screen
 * reader. Plain words, from the person's side: what broke, what we could not
 * tell, and why a list with nothing you avoid can still be Caution. A
 * caution line says what is unknown.
 */
export function rulesSummary(checks: RuleCheck[], state: VerdictState): string {
  const total = checks.length;
  const broken = checks.filter((check) => check.outcome === 'broken').length;
  const unchecked = checks.filter((check) => check.outcome === 'unchecked').length;

  if (total === 0) return 'Your profile has no rules yet, so there was nothing to check';
  if (broken > 0) return `Breaks ${ofYourRules(broken, total)}`;
  if (unchecked > 0) return `We could not check ${ofYourRules(unchecked, total)}`;
  // Every rule kept, but the engine still said Caution: the profile has a
  // severe allergy and our team has not checked the ingredient list.
  if (state !== 'safe') return 'Nothing you avoid is listed, but our team has not checked this list yet';
  return 'Nothing you avoid is listed';
}

/** Broken first, then the ones we could not check, then the kept ones, as in the profile. */
const ORDER: Record<RuleCheck['outcome'], number> = { broken: 0, unchecked: 1, met: 2 };

type RulesCardProps = {
  /** "Thabo's rules". */
  title: string;
  checks: RuleCheck[];
  state: VerdictState;
};

export function RulesCard({ title, checks, state }: RulesCardProps) {
  const { colors, shadows } = useNjamTheme();
  const [open, setOpen] = useState(false);
  const ink = { safe: colors.verdictSafeInk, caution: colors.verdictCautionInk, unsafe: colors.verdictUnsafeInk }[state];

  const sorted = [...checks].sort((a, b) => ORDER[a.outcome] - ORDER[b.outcome]);
  const problems = sorted.filter((check) => check.outcome !== 'met');
  const hasMore = problems.length < sorted.length;
  const shown = open ? sorted : problems;

  return (
    <View style={[styles.card, shadows.ambient, { backgroundColor: colors.surfaceRaised }]}>
      <CardHeader
        title={title}
        summary={rulesSummary(checks, state)}
        summaryColor={ink}
        open={open}
        onToggle={hasMore ? () => setOpen((now) => !now) : undefined}
      />
      {shown.map((check) => (
        <CheckRow key={check.label} check={check} />
      ))}
    </View>
  );
}

function CheckRow({ check }: { check: RuleCheck }) {
  const { colors } = useNjamTheme();
  const divider = { borderTopWidth: border.hairline, borderTopColor: colors.line };

  if (check.outcome === 'met') {
    return (
      <View accessible accessibilityLabel={`${check.label}. ${check.detail}.`} style={[styles.metRow, divider]}>
        <Icon name="check" color={colors.ink} />
        <Text style={[typography.body, styles.flex, { color: colors.ink }]}>{check.label}</Text>
        <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{check.detail}</Text>
      </View>
    );
  }

  const broken = check.outcome === 'broken';
  return (
    <View
      accessible
      accessibilityLabel={`${broken ? 'Not met' : 'Could not check'}: ${check.label}. ${check.detail}.`}
      style={[styles.problemRow, divider]}>
      <VerdictMark state={broken ? 'unsafe' : 'caution'} size={icon.sizeMd} ground="surface" />
      <View style={styles.flex}>
        <Text style={[typography.title, { color: colors.ink }]}>{check.label}</Text>
        <Text style={[typography.bodyS, { color: broken ? colors.verdictUnsafeInk : colors.verdictCautionInk }]}>
          {check.detail}
        </Text>
      </View>
    </View>
  );
}

type PastRulesCardProps = {
  title: string;
  /** "Scanned 14/10/2026, 09:12. Your rules may have changed since." */
  summary: string;
  reasons: VerdictReason[];
  state: VerdictState;
};

/** A past scan: its reason lines as they were shown, under the same header. */
export function PastRulesCard({ title, summary, reasons, state }: PastRulesCardProps) {
  const { colors, shadows } = useNjamTheme();
  const ink = { safe: colors.verdictSafeInk, caution: colors.verdictCautionInk, unsafe: colors.verdictUnsafeInk }[state];

  return (
    <View style={[styles.card, shadows.ambient, { backgroundColor: colors.surfaceRaised }]}>
      <CardHeader title={title} summary={summary} open />
      {reasons.map((reason) => (
        <View
          key={reason.text}
          style={[styles.problemRow, { borderTopWidth: border.hairline, borderTopColor: colors.line }]}>
          <Icon name={reason.icon} color={ink} />
          <Text style={[typography.body, styles.flex, { color: colors.ink }]}>{reason.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
  },
  // A broken or unchecked rule: two lines, mark at the top.
  problemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
  },
  // A kept rule: one quiet line.
  metRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingVertical: space.s2,
  },
  flex: {
    flex: 1,
  },
});
