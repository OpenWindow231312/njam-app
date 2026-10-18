/**
 * SettingsCard: one white card on the Profile tabs (Rules, Household,
 * Settings), as drawn in Figma on 18 Oct 2026.
 *
 * A header (an icon in a sunken circle, a headline, an optional caption),
 * then its rows with a hairline between each, like ListGroup. Rows are
 * usually ListRows, which pad themselves. Anything else (a row of chips, a
 * pair of buttons) goes in a CardBlock so it lines up with them.
 *
 * It is built only from existing tokens and ListGroup's own recipe, so it
 * changes nothing in the design system; it just gives the group a header.
 */
import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system';
import { border, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type SettingsCardProps = {
  title: string;
  /** One line under the title that says what the card is for. */
  caption?: string;
  /** Material Symbols ligature for the header circle. */
  icon: string;
  children: ReactNode;
};

export function SettingsCard({ title, caption, icon, children }: SettingsCardProps) {
  const { colors, shadows } = useNjamTheme();
  // toArray drops false and null, so `{isOwner && <ListRow />}` leaves no empty divider.
  const items = Children.toArray(children);

  // Two views, as in ListGroup: the outer carries the ambient shadow, the
  // inner clips pressed rows to the rounded corners (a clipping view on iOS
  // cannot also cast a shadow).
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <View style={styles.clip}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: colors.surfaceSunken }]}>
            <Icon name={icon} size="sm" color={colors.brandForest} />
          </View>
          <View style={styles.titles}>
            <Text accessibilityRole="header" style={[typography.headline, { color: colors.ink }]}>
              {title}
            </Text>
            {caption && <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{caption}</Text>}
          </View>
        </View>
        {items.map((item, index) => (
          <Fragment key={index}>
            <View style={[styles.divider, { backgroundColor: colors.line }]} />
            {item}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

/** Padding for anything in a SettingsCard that is not a ListRow. */
export function CardBlock({ children }: { children: ReactNode }) {
  return <View style={styles.block}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
  },
  clip: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingTop: space.s4,
    paddingBottom: space.s3,
  },
  badge: {
    width: layout.iconBadgeSize,
    height: layout.iconBadgeSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
  },
  divider: {
    height: border.hairline,
    marginHorizontal: space.s4,
  },
  block: {
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
  },
});
