/**
 * PhotoStepCard: one photo Njam needs when a barcode is not in the database
 * yet ("Photo 1, Front of the pack"; "Photo 2, Nutrition and ingredients").
 *
 * A white card (ambient shadow): the photo, or an "add_a_photo" well while it
 * is missing, then the step, what to photograph and why, and one small
 * button: "Take photo" (forest) until it is done, then "Retake" (tonal).
 *
 * A finished photo gets a small forest tick badge. It is deliberately a plain
 * Material "check", not the Safe verdict mark: a photo being taken says
 * nothing about whether the food is safe, and verdict marks mean verdicts only.
 */
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type PhotoStepCardProps = {
  /** e.g. "Photo 1". */
  step: string;
  /** What to photograph: "Front of the pack". */
  title: string;
  /** Why, or how: "The whole panel, flat and in focus". */
  supporting: string;
  /** The photo once taken: the camera result ({ uri }) or a bundled image. */
  photo?: ImageSourcePropType;
  onTakePhoto: () => void;
};

export function PhotoStepCard({ step, title, supporting, photo, onTakePhoto }: PhotoStepCardProps) {
  const { colors, shadows } = useNjamTheme();
  const done = Boolean(photo);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <View>
        <View
          style={[styles.thumb, { backgroundColor: done ? colors.surfaceMedia : colors.surface }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          {done ? (
            <Image source={photo} style={styles.image} accessibilityIgnoresInvertColors />
          ) : (
            <Icon name="add_a_photo" size="lg" color={colors.brandForest} />
          )}
        </View>
        {done && (
          <View style={[styles.badge, { backgroundColor: colors.surfaceRaised }]}>
            <View style={[styles.tick, { backgroundColor: colors.iconBadge }]}>
              <Icon name="check" size="xs" color={colors.onIconBadge} selected />
            </View>
          </View>
        )}
      </View>

      <View style={styles.text}>
        <Text style={[typography.overline, { color: colors.inkSubtle }]}>{step}</Text>
        <Text style={[typography.title, { color: colors.ink }]}>{title}</Text>
        <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{supporting}</Text>
      </View>

      <Button
        label={done ? 'Retake' : 'Take photo'}
        variant={done ? 'tonal' : 'secondary'}
        size="small"
        onPress={onTakePhoto}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    padding: space.s3,
    borderRadius: radius.lg,
  },
  thumb: {
    width: layout.thumbLg,
    height: layout.thumbLg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  badge: {
    position: 'absolute',
    right: -space.s1,
    bottom: -space.s1,
    width: layout.verdictBadgeSize,
    height: layout.verdictBadgeSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    width: layout.verdictBadgeSize - space.s1,
    height: layout.verdictBadgeSize - space.s1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: space.s1,
  },
});
