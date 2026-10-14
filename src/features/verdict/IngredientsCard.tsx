/**
 * IngredientsCard: the full ingredient list, in label order.
 *
 * An ingredient that broke one of the rules is set in bold and in the
 * not-safe ink, so you can find it in the list. One that may break a rule
 * (cocoa, for someone avoiding caffeine) is bold in the caution ink. Bold as
 * well as colour, so it does not rely on colour alone, and the rules card
 * says the same in words.
 *
 * The note at the bottom says where the list came from when our team has not
 * checked it: "Read from your photo. Not yet checked by our team."
 */
import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system';
import { fontFamilies, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type IngredientsCardProps = {
  /** As printed, in label order. */
  ingredients: string[];
  /** The ones that broke a rule, as printed. */
  highlighted: string[];
  /** The ones that may break a rule, as printed. */
  cautioned?: string[];
  note: string | null;
};

export function IngredientsCard({ ingredients, highlighted, cautioned = [], note }: IngredientsCardProps) {
  const { colors, shadows } = useNjamTheme();

  /** Bold in the verdict's ink if it broke, or may break, a rule. */
  function emphasis(name: string) {
    if (highlighted.includes(name)) return { fontFamily: fontFamilies.textBold, color: colors.verdictUnsafeInk };
    if (cautioned.includes(name)) return { fontFamily: fontFamilies.textBold, color: colors.verdictCautionInk };
    return null;
  }

  return (
    <View style={[styles.card, shadows.ambient, { backgroundColor: colors.surfaceRaised }]}>
      <Text accessibilityRole="header" style={[typography.title, { color: colors.ink }]}>
        Ingredients
      </Text>
      <Text style={[typography.caption, { color: colors.inkMuted }]}>In order of quantity, as on the pack</Text>

      {/* One Text with nested parts, so the list still wraps as one paragraph. */}
      <Text style={[typography.body, { color: colors.ink }]}>
        {ingredients.map((name, index) => (
          <Fragment key={`${index}-${name}`}>
            {index > 0 && ', '}
            <Text style={emphasis(name)}>{name}</Text>
          </Fragment>
        ))}
      </Text>

      {note && (
        <View style={styles.note}>
          <Icon name="info" size="xs" color={colors.inkMuted} />
          <Text style={[typography.caption, styles.flex, { color: colors.inkMuted }]}>{note}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.s2,
    padding: space.s4,
    borderRadius: radius.lg,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s2,
  },
  flex: {
    flex: 1,
  },
});
