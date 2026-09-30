/**
 * Icon: one Material Symbols Rounded icon.
 *
 * Icons are drawn as SVG paths copied from the Material Symbols Rounded font
 * (see icon-paths.ts and scripts/build-icons.py). They used to be drawn as
 * font text using ligatures, but a line of text is laid out differently on
 * iOS, Android and the web, and on the phone that left icons off-centre in
 * their circles. A path in a square box is exactly centred everywhere.
 *
 * Pass the ligature name as listed on fonts.google.com/icons ("no_food").
 * A name that is not in icon-paths.ts yet needs adding to the build script.
 *
 * Icons are decorative by default and hidden from screen readers. The control
 * that holds the icon (Button, IconButton, ListRow) carries the label.
 */
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { iconPaths, type IconName } from '@/components/design-system/icon-paths';
import { icon } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<IconSize, number> = {
  xs: icon.sizeXs,
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
   * Selected state: the heavier weight (icon.weightEmphasis). Selection is
   * also shown by the colour the caller passes in, never by swapping icon.
   */
  selected?: boolean;
};

export function Icon({ name, size = 'md', color, selected = false }: IconProps) {
  const { colors } = useNjamTheme();
  const pixelSize = sizes[size];
  const paths = iconPaths[name as IconName];

  if (__DEV__ && !paths) {
    console.warn(`Icon "${name}" is not in icon-paths.ts. Add it to scripts/build-icons.py and rerun it.`);
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: pixelSize, height: pixelSize }}>
      {paths && (
        // The glyphs are drawn in the font's own 960 unit square.
        <Svg width={pixelSize} height={pixelSize} viewBox="0 0 960 960">
          <Path d={selected ? paths.emphasis : paths.regular} fill={color ?? colors.ink} />
        </Svg>
      )}
    </View>
  );
}
