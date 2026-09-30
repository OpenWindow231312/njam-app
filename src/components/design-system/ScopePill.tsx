/**
 * ScopePill: says who a scan is for, before the scan happens.
 * It sits at the top of the camera panel inside ScanFrame, e.g.
 * "Checking for 3 people" with their initials stacked, or "Checking for Anika".
 *
 * This is mandatory on the scanner. A scan run against the wrong profile gives
 * a confidently wrong verdict, the failure this app cannot afford. Tapping it
 * opens the HouseholdBar (in a sheet the screen provides) to change the scope.
 *
 * White on the camera panel, so it reads over any picture. Drawn
 * layout.scopePillHeight tall; the hit area extends to 48.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/design-system/Avatar';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { border, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type ScopePillProps = {
  /** Names of the people the scan checks, in order. Up to three initials show. */
  people: string[];
  /** e.g. "Checking for 3 people". */
  label: string;
  onPress: () => void;
};

const MAX_FACES = 3;
const EXTRA_HIT = (layout.touchTargetMin - layout.scopePillHeight) / 2;
// Each face after the first tucks a quarter of the way under the one before.
const OVERLAP = -layout.avatarSm / 4;

export function ScopePill({ people, label, onPress }: ScopePillProps) {
  const { colors } = useNjamTheme();
  const faces = people.slice(0, MAX_FACES);

  return (
    <PressableSurface
      onPress={onPress}
      hitSlop={{ top: EXTRA_HIT, bottom: EXTRA_HIT }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Changes whose rules this scan checks"
      radius={radius.pill}
      style={[styles.pill, { backgroundColor: colors.surfaceRaised }]}>
      <View style={styles.faces}>
        {faces.map((name, index) => (
          <View
            key={`${name}-${index}`}
            style={[
              styles.face,
              index > 0 && { marginLeft: OVERLAP },
              // A white edge keeps overlapping circles apart.
              { borderColor: colors.surfaceRaised },
            ]}>
            {/* The first person is the one the app is signed in as. */}
            <Avatar name={name} size="sm" tone={index === 0 ? 'strong' : 'soft'} />
          </View>
        ))}
      </View>
      <Text style={[typography.label, { color: colors.ink }]}>{label}</Text>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    height: layout.scopePillHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    paddingLeft: space.s1,
    paddingRight: space.s3,
    borderRadius: radius.pill,
  },
  faces: {
    flexDirection: 'row',
  },
  face: {
    borderRadius: radius.pill,
    borderWidth: border.hairline,
  },
});
