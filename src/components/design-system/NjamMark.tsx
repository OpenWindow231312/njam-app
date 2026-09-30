/**
 * NjamMark and AiAvatar: the Njam logo mark, a circle with a bite taken out
 * of the upper right.
 *
 * NjamMark draws the mark on its own in one colour. AiAvatar puts it in a
 * forest circle with a lime mark: this is how the app shows "the AI" (the
 * assistant chat header, an AI-read note). Njam never uses a sparkle or a
 * wand for the AI.
 *
 * The mark is not decoration. Never tile or repeat it as a pattern; the pill
 * is the brand's pattern shape. LoadingMark is the same geometry, rotating.
 */
import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';

import { layout, radius } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type NjamMarkProps = {
  /** Rendered size. Pass a value from the tokens. */
  size: number;
  /** A colour from useNjamTheme().colors. */
  color: string;
};

export function NjamMark({ size, color }: NjamMarkProps) {
  // Every mask on a page needs its own id, or two marks on one screen would
  // share (and break) each other's bite. useId gives one per instance; the
  // colons it contains are not allowed inside url(#...), so they are removed.
  const maskId = `bite-${useId().replace(/:/g, '')}`;

  // Coordinates are in the logo's own 100 x 100 drawing box (geometry, not
  // layout values). In an SVG mask white means "show" and black "cut away",
  // so these two are mask instructions, not colours that appear on screen.
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Defs>
        <Mask id={maskId}>
          <Rect x={0} y={0} width={100} height={100} fill="white" />
          <Circle cx={80} cy={20} r={20} fill="black" />
        </Mask>
      </Defs>
      <Circle cx={50} cy={50} r={31} fill={color} mask={`url(#${maskId})`} />
    </Svg>
  );
}

export function AiAvatar() {
  const { colors } = useNjamTheme();
  const size = layout.aiAvatarSize;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: radius.pill,
        backgroundColor: colors.brandForest,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {/* The mark fills a little over half the circle, as on the canvas. */}
      <NjamMark size={Math.round(size * 0.58)} color={colors.brandLime} />
    </View>
  );
}
