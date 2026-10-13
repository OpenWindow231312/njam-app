/**
 * FilterSheet: narrows the product grid by verdict and by store.
 *
 * Opened by the filter button beside the search bar. It is kept short enough
 * to take in at a glance: the verdict is one segmented control, and the
 * stores are small pills with their logos that wrap onto a few lines,
 * rather than a long list to scroll through.
 *
 * Choosing applies straight away; the grid behind updates. The button at the
 * bottom closes the sheet and says how many products are left.
 *
 * Built as a modal, the same way as ProfilePicker on the Verdict screen.
 */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, IconButton, SegmentedControl, StoreLogo } from '@/components/design-system';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import type { Store } from '@/features/home/stores';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/**
 * all       - every product.
 * safe      - only products that are Safe for you.
 * notUnsafe - Safe and Caution, so nothing you cannot eat.
 */
export type VerdictFilter = 'all' | 'safe' | 'notUnsafe';

/** How each verdict filter reads, on its segment and in the "Filtered by" line on Home. */
export const VERDICT_FILTER_WORDS: Record<VerdictFilter, string> = {
  all: 'All',
  safe: 'Safe only',
  notUnsafe: 'Hide Not safe',
};

const VERDICT_SEGMENTS = (['all', 'safe', 'notUnsafe'] as const).map((value) => ({
  value,
  label: VERDICT_FILTER_WORDS[value],
}));

type FilterSheetProps = {
  visible: boolean;
  verdictFilter: VerdictFilter;
  onVerdictFilter: (filter: VerdictFilter) => void;
  stores: Store[];
  /** null means any store. */
  storeId: string | null;
  onStore: (storeId: string | null) => void;
  /** How many products the current filters leave, for the close button. */
  resultCount: number;
  onClose: () => void;
};

export function FilterSheet({
  visible,
  verdictFilter,
  onVerdictFilter,
  stores,
  storeId,
  onStore,
  resultCount,
  onClose,
}: FilterSheetProps) {
  const { colors, shadows } = useNjamTheme();
  const filtered = verdictFilter !== 'all' || storeId !== null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.scrim, { backgroundColor: colors.surfaceScrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />

        <View
          accessibilityViewIsModal
          accessibilityLabel="Filter products"
          style={[styles.card, { backgroundColor: colors.surfaceRaised }, shadows.modal]}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[typography.displayS, styles.title, { color: colors.ink }]}>
              Filter products
            </Text>
            <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} />
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={[typography.overline, { color: colors.inkMuted }]}>
              Verdict
            </Text>
            <SegmentedControl segments={VERDICT_SEGMENTS} value={verdictFilter} onChange={onVerdictFilter} />
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={[typography.overline, { color: colors.inkMuted }]}>
              Store
            </Text>
            <View accessibilityRole="radiogroup" style={styles.stores}>
              <StoreOption name="Any store" logoUrl={null} selected={storeId === null} onPress={() => onStore(null)} />
              {stores.map((store) => (
                <StoreOption
                  key={store.id}
                  name={store.name}
                  logoUrl={store.logoUrl}
                  selected={store.id === storeId}
                  onPress={() => onStore(store.id)}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              label={`Show ${resultCount} ${resultCount === 1 ? 'product' : 'products'}`}
              fullWidth
              onPress={onClose}
            />
            {filtered && (
              <Button
                label="Clear filters"
                variant="text"
                fullWidth
                onPress={() => {
                  onVerdictFilter('all');
                  onStore(null);
                }}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * One store as a pill: its logo, then its name. Drawn like OptionButton
 * (white with the ambient shadow, forest when chosen) but sized to its name,
 * so several share a line.
 */
function StoreOption({
  name,
  logoUrl,
  selected,
  onPress,
}: {
  name: string;
  logoUrl: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, shadows } = useNjamTheme();
  return (
    <PressableSurface
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={name}
      radius={radius.pill}
      style={[
        styles.storeOption,
        { backgroundColor: selected ? colors.selected : colors.surfaceRaised },
        !selected && shadows.ambient,
      ]}>
      <StoreLogo logoUrl={logoUrl} />
      <Text style={[typography.label, { color: selected ? colors.onSelected : colors.ink }]}>{name}</Text>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    padding: layout.screenGutter,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    gap: space.s6,
    padding: space.s6,
    borderRadius: radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  section: {
    gap: space.s3,
  },
  stores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s2,
  },
  // 48 tall: the 40 logo badge with space.s1 around it.
  storeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    minHeight: layout.touchTargetMin,
    padding: space.s1,
    paddingRight: space.s4,
    borderRadius: radius.pill,
  },
  actions: {
    gap: space.s1,
  },
});
