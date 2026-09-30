/**
 * Avatar: a person shown by their initials in a circle.
 *
 * Njam never uses photographs of people. A member with no name yet shows the
 * "person" symbol instead of initials.
 *
 *   size  sm - HouseholdBar and the ScopePill stack (layout.avatarSm).
 *         lg - MemberVerdict (layout.avatarLg).
 *   tone  soft   - sunken circle, ink initials. The default.
 *         strong - forest circle, lime initials. The person the screen is about.
 *
 * Avatars are decorative: the name always appears in text beside them, so the
 * circle is hidden from screen readers.
 */
import { Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { layout, radius, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type AvatarProps = {
  /** The person's name. The first letter of up to two words is shown. */
  name?: string;
  size?: 'sm' | 'lg';
  tone?: 'soft' | 'strong';
};

/** "Anika de Beer" -> "AB", "Thabo" -> "T". Small words like "de" are skipped. */
export function initialsOf(name: string) {
  if (!name.trim()) return '';
  const all = name.trim().split(/\s+/);
  const capitalised = all.filter((word) => word[0] === word[0].toUpperCase());
  // A name typed all in lower case has no capitalised words; use every word then.
  const words = capitalised.length > 0 ? capitalised : all;
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return picked.map((word) => word[0].toUpperCase()).join('');
}

export function Avatar({ name, size = 'sm', tone = 'soft' }: AvatarProps) {
  const { colors } = useNjamTheme();
  const diameter = size === 'lg' ? layout.avatarLg : layout.avatarSm;
  const fill = tone === 'strong' ? colors.brandForest : colors.surfaceSunken;
  const ink = tone === 'strong' ? colors.brandLime : colors.ink;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: diameter,
        height: diameter,
        borderRadius: radius.pill,
        backgroundColor: fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {name?.trim() ? (
        <Text
          allowFontScaling={false}
          style={[size === 'lg' ? typography.title : typography.buttonS, { color: ink }]}>
          {initialsOf(name)}
        </Text>
      ) : (
        <Icon name="person" size={size === 'lg' ? 'md' : 'xs'} color={ink} />
      )}
    </View>
  );
}
