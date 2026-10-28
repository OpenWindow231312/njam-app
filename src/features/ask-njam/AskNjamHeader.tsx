/**
 * AskNjamButton: the way into Ask Njam in a screen's top bar, on the right.
 * Search, History, Verdict, Aisle and Alternatives use it. Home has the
 * bigger AskNjamRow under its search bar instead. The Scanner has neither:
 * nothing should sit over the camera but the scan. Profile has neither: it
 * is where you change settings, not ask about food.
 *
 * Search and History once had it in a row above the headline, with a bar
 * that faded in as you scrolled. While that bar faded, the page showed
 * through it, so on 28 Oct both moved to a solid bar with the pill in it.
 *
 * The way in is a small tonal Button that says "Ask Njam", led by a small
 * AiAvatar (the Njam mark in a forest circle). The avatar on its own read as
 * a profile picture in the user test on 27 Oct, so the label says what it
 * does; the circle keeps it recognisable as the AI. (A chat icon sat there
 * for a while, but "chat" was never added to icon-paths.ts, so it drew
 * nothing.) Tonal keeps it quiet beside the headline, so it never competes
 * with a screen's lime primary button.
 *
 * It is drawn chipHeightLarge (44) tall, not a small Button's 36, so it is
 * the same height as the "For ..." DropdownChip beside it on Verdict, and
 * the same everywhere else it appears. Button extends its tap area to 48.
 */
import { router } from 'expo-router';

import { AiAvatar, Button } from '@/components/design-system';
import { icon, layout } from '@/theme/tokens';

export function AskNjamButton() {
  return (
    <Button
      variant="tonal"
      size="small"
      height={layout.chipHeightLarge}
      leading={<AiAvatar size={icon.sizeMd} />}
      label="Ask Njam"
      onPress={() => router.push('/ask')}
    />
  );
}
