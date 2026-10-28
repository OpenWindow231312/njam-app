/**
 * DietSheet: what a diet or faith rules out, opened by tapping it in
 * onboarding. Everything starts ticked; untick what you are fine with.
 *
 * The line under the list says what an ingredient list cannot tell you
 * (how meat was slaughtered, a certificate), so a diet never promises more
 * than the engine can check.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, Checkbox, Icon, ListGroup } from '@/components/design-system';
import type { DietPreset } from '@/features/onboarding/rule-options';
import { space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type DietSheetProps = {
  /** Null hides the sheet. */
  diet: DietPreset | null;
  /** The keys ticked now, or null when the diet is not on your list yet. */
  ticked: string[] | null;
  onSave: (ticked: string[]) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function DietSheet({ diet, ticked, onSave, onRemove, onClose }: DietSheetProps) {
  const { colors } = useNjamTheme();
  // The ticks are a draft until you press the button, so closing changes
  // nothing. The parent gives the sheet a new key each time it opens, so the
  // draft starts again from what is saved.
  const [draft, setDraft] = useState<string[]>(() => ticked ?? diet?.items.map((item) => item.key) ?? []);

  if (!diet) return null;

  const word = diet.label.toLowerCase();
  const isOn = ticked !== null;

  return (
    <BottomSheet
      visible
      title={`${diet.label}: what we look for`}
      subtitle="Untick anything you are fine with."
      onClose={onClose}
      footer={
        <>
          <Button
            label={isOn ? `Save ${word}` : `Add ${word}`}
            onPress={() => onSave(draft)}
            disabled={draft.length === 0}
            size="large"
            fullWidth
          />
          {isOn && <Button label={`Remove ${word}`} variant="text" onPress={onRemove} fullWidth />}
        </>
      }>
      <ListGroup>
        {diet.items.map((item) => (
          <Checkbox
            key={item.key}
            label={item.label}
            checked={draft.includes(item.key)}
            onChange={(next) =>
              setDraft((now) => (next ? [...now, item.key] : now.filter((key) => key !== item.key)))
            }
          />
        ))}
      </ListGroup>
      <View style={styles.note}>
        <Icon name="info" size="sm" color={colors.inkMuted} />
        <Text style={[typography.bodyS, styles.noteText, { color: colors.inkMuted }]}>{diet.limits}</Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    gap: space.s2,
  },
  noteText: {
    flex: 1,
  },
});
