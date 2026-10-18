/**
 * WhoCanEatIt: everyone in the household with this product's verdict for
 * them, in a row, on the Verdict tab of the result (Figma, 18 Oct 2026).
 *
 * Each person is a MemberVerdict: their initials in a ring, the verdict mark
 * on a badge and the verdict word, so the verdict never rests on colour. The
 * verdicts come from the verdict engine with each person's own rules.
 *
 * Tapping a person shows the whole result for them, the same as choosing
 * them from "For Anika" at the top. The person on show is highlighted.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MemberVerdict } from '@/components/design-system';
import type { VerdictState } from '@/services/verdict';
import { layout, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Person = { id: string; name: string; verdict: VerdictState };

type WhoCanEatItProps = {
  people: Person[];
  /** The person whose result is on show. */
  selectedId: string;
  onSelect: (id: string) => void;
  /** How far the screen's own padding is, so the row can scroll to the edge. */
  edgeInset: number;
};

export function WhoCanEatIt({ people, selectedId, onSelect, edgeInset }: WhoCanEatItProps) {
  const { colors } = useNjamTheme();

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[typography.headline, { color: colors.ink }]}>
        Who can eat it
      </Text>
      {/* A big household scrolls sideways, past the drawer's edge. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -edgeInset }}
        contentContainerStyle={[styles.row, { paddingHorizontal: edgeInset }]}>
        {people.map((person) => (
          <MemberVerdict
            key={person.id}
            name={person.name}
            verdict={person.verdict}
            selected={person.id === selectedId}
            onPress={() => onSelect(person.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.s3,
  },
  row: {
    gap: space.s2,
    minHeight: layout.touchTargetMin,
  },
});
