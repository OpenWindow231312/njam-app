/**
 * Icon: one Material Symbols Rounded glyph.
 *
 * Material Symbols works through ligatures: the font turns the text
 * "barcode_scanner" into the barcode icon. So an icon here is just a <Text>
 * set in the icon font. Always pass the ligature name exactly as listed on
 * fonts.google.com/icons.
 *
 * Icons are decorative by default and hidden from screen readers. The control
 * that holds the icon (Button, IconButton, ListRow) carries the label.
 */
import { Text, type TextStyle } from 'react-native';

import { fontFamilies, icon } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type IconSize = 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<IconSize, number> = {
  sm: icon.sizeSm,
  md: icon.sizeMd,
  lg: icon.sizeLg,
  xl: icon.sizeXl,
};

type IconProps = {
  /** Material Symbols ligature name, e.g. "no_food". */
  name: string;
  size?: IconSize;
  /** A colour from useNjamTheme().colors. Defaults to ink. */
  color?: string;
  /**
   * Selected state. The design system asks for FILL 1 plus weightEmphasis.
   * The Expo font package only ships the outlined (FILL 0) instances, so for
   * now selection is shown by the heavier weight plus the colour change the
   * caller passes in. See the PR notes.
   */
  selected?: boolean;
  style?: TextStyle;
};

export function Icon({ name, size = 'md', color, selected = false, style }: IconProps) {
  const { colors } = useNjamTheme();
  const pixelSize = sizes[size];

  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          fontFamily: selected ? fontFamilies.iconEmphasis : fontFamilies.icon,
          fontSize: pixelSize,
          // Line height equal to size keeps the glyph square and centred.
          lineHeight: pixelSize,
          color: color ?? colors.ink,
        },
        style,
      ]}>
      {name}
    </Text>
  );
}
