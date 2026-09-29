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
 *   none    - nothing.
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
import { border, layout, motion, opacity, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/* ------------------------------------------------------------------ */
/* ListGroup                                                          */
/* ------------------------------------------------------------------ */

export function ListGroup({ children }: { children: ReactNode }) {
  const { colors } = useNjamTheme();
  const rows = Children.toArray(children);

  return (
    <View
      style={[
        styles.group,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.line },
      ]}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 && <View style={[styles.divider, { backgroundColor: colors.line }]} />}
          {row}
        </Fragment>
      ))}
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
          ? { backgroundColor: colors.action, borderColor: colors.action }
          : { backgroundColor: colors.surfaceSunken, borderColor: colors.lineStrong },
      ]}>
      <Animated.View
        style={[
          styles.switchThumb,
          { backgroundColor: on ? colors.onAction : colors.inkSubtle, transform: [{ translateX }] },
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
  supporting?: string;
  trailing?: 'chevron' | 'switch' | 'menu' | 'none';
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
  supporting,
  trailing = 'chevron',
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

  // A switch row does one thing on tap: throw the switch.
  const handlePress = isSwitch ? () => onSwitchChange?.(!switchValue) : onPress;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={isSwitch ? 'switch' : 'button'}
      accessibilityState={isSwitch ? { checked: switchValue, disabled } : { disabled }}
      // Supporting text and value are part of the row's label, not separate nodes.
      accessibilityLabel={[title, supporting, value].filter(Boolean).join(', ')}
      style={({ pressed }) => [
        styles.row,
        // A flat sunken fill on press, the same colour as fields, rather than
        // a translucent tint (design system v1.2).
        pressed && { backgroundColor: colors.surfaceSunken },
        disabled && { opacity: opacity.disabled },
      ]}>
      {iconName && <Icon name={iconName} color={iconColor} />}

      <View style={styles.text}>
        <Text style={[typography.title, { color: titleColor }]}>{title}</Text>
        {supporting && (
          <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{supporting}</Text>
        )}
      </View>

      {value && trailing !== 'switch' && (
        <Text style={[typography.button, { color: colors.inkMuted }]}>{value}</Text>
      )}
      {trailing === 'chevron' && <Icon name="chevron_right" color={colors.inkSubtle} />}
      {trailing === 'menu' && <Icon name="more_vert" color={colors.inkSubtle} />}
      {isSwitch && <RowSwitch on={switchValue} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.lg,
    borderWidth: border.hairline,
    overflow: 'hidden',
  },
  divider: {
    height: border.hairline,
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
