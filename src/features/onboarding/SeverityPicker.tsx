/**
 * SeverityPicker: how bad a reaction to one allergen is, as three
 * OptionButtons (Avoid, Moderate, Severe), with an info button that explains
 * each level in plain words.
 *
 * Shared by onboarding and the Rules tab on Profile, so both ask the same
 * question the same way. It keeps no state: the parent holds the level.
 *
 * The explanation opens in place under the choices instead of in a dialog,
 * because the picker often sits inside a BottomSheet, and a second modal on
 * top of a sheet is easy to get stuck behind on iOS.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton, OptionButton } from '@/components/design-system';
import type { AllergySeverity } from '@/features/onboarding/my-rules';
import { SEVERITY_CHOICES } from '@/features/onboarding/rule-options';
import { space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type SeverityPickerProps = {
  /** The question above the choices: "How bad is a reaction?" */
  title: string;
  severity: AllergySeverity;
  onChange: (severity: AllergySeverity) => void;
};

export function SeverityPicker({ title, severity, onChange }: SeverityPickerProps) {
  const { colors } = useNjamTheme();
  const [explaining, setExplaining] = useState(false);

  return (
    <View style={styles.picker}>
      <View style={styles.heading}>
        <Text style={[typography.title, styles.title, { color: colors.ink }]}>{title}</Text>
        <IconButton
          icon="info"
          accessibilityLabel={explaining ? 'Hide what the levels mean' : 'What the levels mean'}
          selected={explaining}
          onPress={() => setExplaining((open) => !open)}
        />
      </View>

      <View accessibilityRole="radiogroup" style={styles.options}>
        {SEVERITY_CHOICES.map((choice) => (
          <OptionButton
            key={choice.label}
            label={choice.label}
            selected={severity === choice.value}
            onPress={() => onChange(choice.value)}
          />
        ))}
      </View>

      {explaining && (
        <View style={styles.meanings}>
          {SEVERITY_CHOICES.map((choice) => (
            <Text key={choice.label} style={[typography.bodyS, { color: colors.inkMuted }]}>
              <Text style={{ color: colors.ink }}>{choice.label}: </Text>
              {choice.meaning}
            </Text>
          ))}
          <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
            Every level blocks a product that contains it.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    gap: space.s2,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s2,
  },
  meanings: {
    gap: space.s1,
  },
});
