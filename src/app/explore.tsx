/**
 * Component preview.
 *
 * A temporary screen that shows every design system component in one place,
 * so they can be checked on a phone in both light and dark mode. It replaces
 * the Expo starter "Explore" tab and will itself be replaced by a real screen.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  ListGroup,
  ListRow,
  SectionHeader,
  TextField,
  VerdictBanner,
  VerdictChip,
} from '@/components/design-system';
import { layout, space } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

export default function ComponentPreviewScreen() {
  const { colors } = useNjamTheme();
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');
  const [carbs, setCarbs] = useState('10');
  const [recallAlerts, setRecallAlerts] = useState(true);
  const [loading, setLoading] = useState(false);

  const fakeCheck = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader
          headline="What can you not eat?"
          deck="You can change any of it later."
          step={2}
          totalSteps={6}
          tag="Your rules"
        />

        <View style={styles.block}>
          <SectionHeader variant="simple" headline="Buttons" />
          <Button
            label="Scan a barcode"
            icon="barcode_scanner"
            fullWidth
            loading={loading}
            loadingLabel="Checking 6 rules"
            onPress={fakeCheck}
          />
          <View style={styles.row}>
            <Button label="See alternatives" icon="swap_horiz" variant="tonal" onPress={() => {}} />
            <Button label="Skip for now" variant="text" onPress={() => {}} />
          </View>
          <View style={styles.row}>
            <Button label="Review filters" icon="filter_alt" variant="outlined" onPress={() => {}} />
            <Button label="Add a rule" icon="add" variant="tonal" size="small" onPress={() => {}} />
          </View>
          <Button label="Scan a barcode" disabled onPress={() => {}} />
        </View>

        <View style={styles.block}>
          <SectionHeader variant="simple" headline="Fields" />
          <TextField variant="search" label="Search products" value={search} onChangeText={setSearch} placeholder="Ouma Rusks" />
          <TextField
            label="Email"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            helper="The one you use for Njam."
          />
          <TextField label="Carbs per serving" variant="numeric" unit="g" value={carbs} onChangeText={setCarbs} />
          <TextField
            label="Password"
            icon="lock"
            value="abc"
            onChangeText={() => {}}
            secureTextEntry
            error="Use at least 8 characters."
          />
        </View>

        <View style={styles.block}>
          <SectionHeader variant="simple" headline="Verdicts" />
          <View style={styles.row}>
            <VerdictChip state="safe" />
            <VerdictChip state="caution" />
            <VerdictChip state="unsafe" />
            <VerdictChip state="unsafe" memberName="Thabo" />
          </View>
          <VerdictBanner
            state="unsafe"
            headline="Not safe for Anika"
            productName="Ouma Rusks Buttermilk"
            reasons={[
              { icon: 'no_food', text: 'Contains milk solids. You marked milk severe.' },
              { icon: 'science', text: 'E322 soya lecithin is on your banned list.' },
            ]}
            sourceNote="Checked against 6 rules in your profile."
          />
          <VerdictBanner
            state="caution"
            headline="Check this one"
            reasons={[
              { icon: 'nutrition', text: 'Carbs are 9.1 g per serving, close to your 10 g limit.' },
              { icon: 'no_food', text: 'May contain traces of peanut, per the manufacturer.' },
            ]}
            sourceNote="Read from the label photo, not yet verified."
          />
          <VerdictBanner
            state="safe"
            headline="Safe for everyone"
            reasons={[{ icon: 'task_alt', text: 'No milk, no peanut, no sulphites. All 6 rules passed.' }]}
            sourceNote="Verified record, updated 2 weeks ago."
          />
        </View>

        <View style={styles.block}>
          <SectionHeader variant="simple" headline="Rows" />
          <ListGroup>
            <ListRow icon="no_food" title="Allergies and severity" supporting="Milk severe, egg moderate" value="2" onPress={() => {}} />
            <ListRow icon="restaurant" title="Diet and faith" supporting="Halal" value="1" onPress={() => {}} />
            <ListRow
              icon="notifications"
              title="Recall alerts"
              supporting="Tell me when a scanned product is recalled"
              trailing="switch"
              switchValue={recallAlerts}
              onSwitchChange={setRecallAlerts}
            />
            <ListRow icon="delete" title="Delete this profile" destructive onPress={() => {}} />
          </ListGroup>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingVertical: space.s6,
    gap: space.s8,
  },
  block: {
    gap: space.s3,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.s2,
  },
});
