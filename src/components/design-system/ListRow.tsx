/**
 * ListRow and ListGroup: the workhorse of Profile, Household, Settings and
 * the admin queue.
 *
 * A row is a leading icon, a title, an optional supporting line, and exactly
 * ONE trailing thing:
 *   chevron - the row opens something.
 *   value   - a count beside the chevron, e.g. "3".
 *   switch  - the row toggles something. Tapping anywhere throws the switch.
 *   menu    - "more_vert". Admin review queue only.
 *   expand  - "expand_more", for a row that opens a section in place
 *             (Nutrients, Ingredients on the product result). Pass `expanded`.
 *   none    - nothing.
 *
 * `supportingVerdict` turns the supporting line into a verdict line: a small
 * verdict dot before it and the text in that verdict's ink, e.g.
 * "2 flagged: milk, E322". The words carry the meaning; the dot repeats it.
 *
 * Rows always sit inside a ListGroup, which draws the rounded container and
 * the hairlines between rows (not around each row).
 *
 * A destructive row ("Delete this profile") uses verdictUnsafeInk for its
 * text and icon, never the red fill, and its onPress should open a confirming
 * BottomSheet rather than delete straight away.
 */
import { Children, Fragment, useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { VerdictMark, type VerdictState } from '@/components/design-system/VerdictMark';
import { border, icon, layout, motion, opacity, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/* ------------------------------------------------------------------ */
/* ListGroup                                                          */
/* ------------------------------------------------------------------ */

export function ListGroup({ children }: { children: ReactNode }) {
  const { colors, shadows } = useNjamTheme();
  const rows = Children.toArray(children);

  // Two views on purpose: the outer one carries the ambient shadow, the inner
  // one clips the pressed rows to the rounded corners. On iOS a view that
  // clips (overflow: hidden) cannot also show a shadow.
  return (
    <View style={[styles.group, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <View style={styles.clip}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {/* Dividers between rows, inset from the edges like the canvas. */}
            {index > 0 && <View style={[styles.divider, { backgroundColor: colors.line }]} />}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Switch                                                             */
/* ------------------------------------------------------------------ */

// The thumb fits inside the track with space.s1 all round.
const THUMB_SIZE = layout.switchHeight - space.s1 * 2;
const THUMB_TRAVEL = layout.switchWidth - THUMB_SIZE - space.s1 * 2;

function RowSwitch({ on }: { on: boolean }) {
  const { colors } = useNjamTheme();
  const position = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(position, {
      toValue: on ? 1 : 0,
      duration: motion.chipSelect,
      useNativeDriver: true,
    }).start();
  }, [on, position]);

  const translateX = position.interpolate({ inputRange: [0, 1], outputRange: [0, THUMB_TRAVEL] });

  return (
    <View
      style={[
        styles.switchTrack,
        on
          ? { backgroundColor: colors.selected, borderColor: colors.selected }
          : { backgroundColor: colors.surfaceSunken, borderColor: colors.lineStrong },
      ]}>
      <Animated.View
        style={[
          styles.switchThumb,
          { backgroundColor: on ? colors.onSelected : colors.inkSubtle, transform: [{ translateX }] },
        ]}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* ListRow                                                            */
/* ------------------------------------------------------------------ */

type ListRowProps = {
  title: string;
  /** Leading Material Symbols ligature. */
  icon?: string;
  /**
   * How the leading icon is drawn:
   *   plain  - the bare icon (default).
   *   soft   - in a sunken circle. Settings and toggles.
   *   strong - lime icon in a forest circle. People and choices you pick.
   */
  iconBadge?: 'plain' | 'soft' | 'strong';
  supporting?: string;
  /** Colours the supporting line in this verdict's ink and puts its dot before it. */
  supportingVerdict?: VerdictState;
  trailing?: 'chevron' | 'switch' | 'menu' | 'expand' | 'none';
  /** For trailing="expand": whether the section below is open. */
  expanded?: boolean;
  /** A count shown before the chevron. */
  value?: string;
  /** For trailing="switch": whether it is on. */
  switchValue?: boolean;
  /** For trailing="switch": called with the new value when the row is tapped. */
  onSwitchChange?: (next: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export function ListRow({
  title,
  icon: iconName,
  iconBadge = 'plain',
  supporting,
  supportingVerdict,
  trailing = 'chevron',
  expanded = false,
  value,
  switchValue = false,
  onSwitchChange,
  onPress,
  destructive = false,
  disabled = false,
}: ListRowProps) {
  const { colors } = useNjamTheme();
  const isSwitch = trailing === 'switch';

  const titleColor = destructive ? colors.verdictUnsafeInk : colors.ink;
  const iconColor = destructive ? colors.verdictUnsafeInk : colors.inkMuted;

  const verdictInk = supportingVerdict
    ? {
        safe: colors.verdictSafeInk,
        caution: colors.verdictCautionInk,
        unsafe: colors.verdictUnsafeInk,
      }[supportingVerdict]
    : undefined;

  // A switch row does one thing on tap: throw the switch.
  const handlePress = isSwitch ? () => onSwitchChange?.(!switchValue) : onPress;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={isSwitch ? 'switch' : 'button'}
      accessibilityState={
        isSwitch
          ? { checked: switchValue, disabled }
          : trailing === 'expand'
            ? { expanded, disabled }
            : { disabled }
      }
      // Supporting text and value are part of the row's label, not separate nodes.
      accessibilityLabel={[title, supporting, value].filter(Boolean).join(', ')}
      style={({ pressed }) => [
        styles.row,
        // A flat sunken fill on press, the same colour as fields, rather than
        // a translucent tint (design system v1.2).
        pressed && { backgroundColor: colors.surfaceSunken },
        disabled && { opacity: opacity.disabled },
      ]}>
      {iconName && iconBadge === 'plain' && <Icon name={iconName} color={iconColor} />}
      {iconName && iconBadge !== 'plain' && (
        <View
          style={[
            styles.badge,
            { backgroundColor: iconBadge === 'strong' ? colors.iconBadge : colors.surfaceSunken },
          ]}>
          <Icon
            name={iconName}
            size="sm"
            color={
              iconBadge === 'strong'
                ? colors.onIconBadge
                : destructive
                  ? colors.verdictUnsafeInk
                  : colors.brandForest
            }
          />
        </View>
      )}

      <View style={styles.text}>
        <Text style={[typography.title, { color: titleColor }]}>{title}</Text>
        {supporting && (
          <View style={styles.supportingRow}>
            {supportingVerdict && <VerdictMark state={supportingVerdict} size={icon.markXs} ground="surface" />}
            <Text style={[typography.bodyS, styles.supportingText, { color: verdictInk ?? colors.inkMuted }]}>
              {supporting}
            </Text>
          </View>
        )}
      </View>

      {value && trailing !== 'switch' && (
        <Text style={[typography.button, { color: colors.inkMuted }]}>{value}</Text>
      )}
      {trailing === 'chevron' && <Icon name="chevron_right" color={colors.inkSubtle} />}
      {trailing === 'menu' && <Icon name="more_vert" color={colors.inkSubtle} />}
      {trailing === 'expand' && (
        <Icon name={expanded ? 'expand_less' : 'expand_more'} color={colors.inkSubtle} />
      )}
      {isSwitch && <RowSwitch on={switchValue} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.lg,
  },
  clip: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: {
    height: border.hairline,
    marginHorizontal: space.s4,
  },
  row: {
    minHeight: layout.touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s3,
    paddingHorizontal: space.s4,
  },
  text: {
    flex: 1,
  },
  supportingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
  },
  supportingText: {
    flexShrink: 1,
  },
  badge: {
    width: layout.iconBadgeSize,
    height: layout.iconBadgeSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTrack: {
    width: layout.switchWidth,
    height: layout.switchHeight,
    borderRadius: radius.pill,
    borderWidth: border.hairline,
    padding: space.s1 - border.hairline,
  },
  switchThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.pill,
  },
});
