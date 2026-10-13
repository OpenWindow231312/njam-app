/**
 * ProfilePicker: "Viewing for", the list of people in your household,
 * opened from the chip at the top right of the Verdict screen.
 *
 * Each row shows that person's verdict for this product, decided by the
 * verdict engine with their own rules, so you can see at a glance who can
 * eat it. Choosing a row shows the full verdict for that person.
 *
 * It is a modal (scrim plus a white card with the modal shadow), built the
 * same way as ConfirmDialog. A modal is one of the three places the design
 * system allows real elevation, so the list does not float as a popover.
 */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton, ListGroup, ListRow } from '@/components/design-system';
import type { VerdictState } from '@/services/verdict';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

export type PickerProfile = {
  id: string;
  name: string;
  /** This product's verdict for them, from the verdict engine. */
  verdict: VerdictState;
};

type ProfilePickerProps = {
  visible: boolean;
  profiles: PickerProfile[];
  selectedId: string;
  onSelect: (profileId: string) => void;
  onClose: () => void;
};

/** The verdict in words for a row. Same words as the Verdict screen's headline. */
const VERDICT_WORDS: Record<VerdictState, string> = {
  safe: 'Safe',
  caution: 'Check this one',
  unsafe: 'Not safe',
};

export function ProfilePicker({ visible, profiles, selectedId, onSelect, onClose }: ProfilePickerProps) {
  const { colors, shadows } = useNjamTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.scrim, { backgroundColor: colors.surfaceScrim }]}>
        {/* Tapping outside closes it: choosing nobody changes nothing. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />

        <View
          accessibilityViewIsModal
          accessibilityLabel="Viewing for"
          style={[styles.card, { backgroundColor: colors.surfaceRaised }, shadows.modal]}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[typography.displayS, styles.title, { color: colors.ink }]}>
              Viewing for
            </Text>
            <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} />
          </View>

          <ListGroup>
            {profiles.map((profile) => (
              <ListRow
                key={profile.id}
                title={profile.name}
                icon="person"
                iconBadge="strong"
                supporting={VERDICT_WORDS[profile.verdict]}
                supportingVerdict={profile.verdict}
                value={profile.id === selectedId ? 'Viewing' : undefined}
                trailing="none"
                onPress={() => onSelect(profile.id)}
              />
            ))}
          </ListGroup>
        </View>
      </View>
    </Modal>
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
    gap: space.s4,
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
});
