/**
 * CardHeader: the top row of a white card on the Verdict screen (the rules
 * card, Nutrition). A title, a one-line summary under it, and, when the card
 * has more to show, a chevron. The whole row toggles the card and is at
 * least the 48 touch target.
 *
 * The summary can take a verdict ink ("1 of 5 rules not met" in the
 * not-safe ink), or stay muted for a neutral card.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type CardHeaderProps = {
  title: string;
  summary: string;
  /** Defaults to inkMuted. */
  summaryColor?: string;
  open: boolean;
  /** Leave out when there is nothing more to show; the row is then not tappable. */
  onToggle?: () => void;
};

export function CardHeader({ title, summary, summaryColor, open, onToggle }: CardHeaderProps) {
  const { colors } = useNjamTheme();

  const words = (
    <View style={styles.words}>
      <Text style={[typography.title, { color: colors.ink }]}>{title}</Text>
      <Text style={[typography.bodyS, { color: summaryColor ?? colors.inkMuted }]}>{summary}</Text>
    </View>
  );

  if (!onToggle) {
    return (
      <View accessible accessibilityLabel={`${title}. ${summary}`} style={styles.row}>
        {words}
      </View>
    );
  }

  return (
    <PressableSurface
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${summary}`}
      accessibilityState={{ expanded: open }}
      radius={radius.lg}
      shrink={false}
      style={styles.row}>
      {words}
      <Icon name={open ? 'expand_less' : 'expand_more'} color={colors.ink} />
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    minHeight: layout.touchTargetMin,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
  },
  words: {
    flex: 1,
  },
});
