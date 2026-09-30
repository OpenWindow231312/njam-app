/**
 * MemberVerdict: one household member and the verdict a product got for them.
 *
 * On the product result every member gets one of these in a row, and tapping
 * a person shows why (a tab list). It also works on its own anywhere a verdict
 * needs a face.
 *
 * The verdict is carried three ways, never by colour alone:
 *   - the ring round the avatar (forest for Safe, orange, red),
 *   - the verdict dot on the white badge (circle, triangle, octagon),
 *   - the verdict word under the name ("Not safe").
 *
 * The Safe ring is forest, not lime: a lime ring on white would all but vanish.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/design-system/Avatar';
import { VerdictMark, type VerdictState } from '@/components/design-system/VerdictMark';
import { border, icon, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

const words: Record<VerdictState, string> = { safe: 'Safe', caution: 'Check', unsafe: 'Not safe' };
const spokenWords: Record<VerdictState, string> = { safe: 'safe', caution: 'caution', unsafe: 'not safe' };

type MemberVerdictProps = {
  name: string;
  verdict: VerdictState;
  /** Whether this person's reasons are the ones showing. */
  selected?: boolean;
  onPress?: () => void;
};

// The avatar, a white gap, then the coloured ring, all as nested circles.
const RING_BOX = layout.avatarLg + border.ring * 4;

export function MemberVerdict({ name, verdict, selected = false, onPress }: MemberVerdictProps) {
  const { colors } = useNjamTheme();

  const ringColor = {
    safe: colors.brandForest,
    caution: colors.verdictCaution,
    unsafe: colors.verdictUnsafe,
  }[verdict];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}, ${spokenWords[verdict]}`}
      style={({ pressed }) => [
        styles.tab,
        (selected || pressed) && { backgroundColor: colors.surfaceSunken },
      ]}>
      <View>
        <View style={[styles.ring, { backgroundColor: ringColor }]}>
          <View style={[styles.gap, { backgroundColor: colors.surfaceRaised }]}>
            <Avatar name={name} size="lg" tone="strong" />
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.surfaceRaised }]}>
          <VerdictMark state={verdict} size={icon.markSm} ground="surface" />
        </View>
      </View>

      <Text style={[typography.label, styles.name, { color: colors.ink }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[typography.caption, { color: colors.inkMuted }]}>{words[verdict]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: space.s1,
    paddingVertical: space.s3,
    paddingHorizontal: space.s1,
    borderRadius: radius.lg,
  },
  ring: {
    width: RING_BOX,
    height: RING_BOX,
    borderRadius: radius.pill,
    padding: border.ring,
  },
  gap: {
    flex: 1,
    borderRadius: radius.pill,
    padding: border.ring,
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: layout.verdictBadgeSize,
    height: layout.verdictBadgeSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: space.s1,
  },
});
