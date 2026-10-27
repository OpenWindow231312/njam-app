/**
 * ScanCard: one past scan on Your scans, as a white card.
 *
 * The verdict chip and when it was scanned sit on top, then the product name,
 * then the first reason the verdict gave, then whose rules it was checked
 * against. The reason is the point of the card: it answers "why" without
 * opening the scan. Tapping the card reopens the full verdict.
 */
import { StyleSheet, Text, View } from 'react-native';

import { VerdictChip } from '@/components/design-system';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import type { ScanRecord } from '@/features/verdict/scans';
import { radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/** "Today, 14:32" for a scan from today, otherwise "26 Oct, 18:04". */
function whenScanned(iso: string): string {
  const scanned = new Date(iso);
  const time = scanned.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const isToday = scanned.toDateString() === new Date().toDateString();
  const day = isToday ? 'Today' : scanned.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${day}, ${time}`;
}

type ScanCardProps = {
  scan: ScanRecord;
  onPress: () => void;
};

export function ScanCard({ scan, onPress }: ScanCardProps) {
  const { colors, shadows } = useNjamTheme();
  const name = scan.productName ?? 'Product from a label photo';
  const firstReason = scan.reasons[0]?.text;
  const forWhom = `For ${scan.profileName ?? 'your profile'}`;
  const when = whenScanned(scan.scannedAt);

  return (
    <PressableSurface
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[name, firstReason, forWhom, when].filter(Boolean).join(', ')}
      radius={radius.lg}
      style={[styles.card, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <View style={styles.top}>
        <VerdictChip state={scan.verdict} />
        <Text style={[typography.caption, { color: colors.inkSubtle }]}>{when}</Text>
      </View>

      <Text style={[typography.title, { color: colors.ink }]}>{name}</Text>

      {/* A scan saved without reasons simply has no reason line. */}
      {firstReason && (
        <Text style={[typography.bodyS, { color: colors.inkMuted }]} numberOfLines={2}>
          {firstReason}
        </Text>
      )}

      <Text style={[typography.caption, { color: colors.inkSubtle }]}>{forWhom}</Text>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.s2,
    padding: space.s4,
    borderRadius: radius.lg,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.s1,
  },
});
