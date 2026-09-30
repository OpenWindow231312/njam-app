/**
 * Component preview.
 *
 * A temporary screen that shows every design system component in one place,
 * so they can be checked on a phone. Each component sits under a small
 * label naming its variant or state ("Primary, large", "Error", "Disabled"),
 * so states can be compared side by side. (Dark mode is paused for now.) It
 * replaces the Expo starter "Explore" tab and will itself be replaced by a
 * real screen.
 */
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AiAvatar,
  Button,
  ChatBubble,
  ChatComposer,
  Checkbox,
  ConfirmDialog,
  DropdownChip,
  EmptyState,
  EVERYONE,
  FilterChip,
  HouseholdBar,
  IconButton,
  ListGroup,
  ListRow,
  MemberVerdict,
  OptionButton,
  PhotoStepCard,
  ProductCard,
  ProductTile,
  RuleChip,
  ScanFrame,
  ScopePill,
  SectionHeader,
  SegmentedControl,
  Slider,
  Snackbar,
  StepProgress,
  TabBar,
  type TabKey,
  TextField,
  VerdictBanner,
  VerdictChip,
} from '@/components/design-system';
import { layout, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

// Stands in for a label photo on the preview; a bundled image, so no network is needed.
const SAMPLE_PHOTO = require('../../assets/images/icon.png');

/** A small capitals label above one variant or state, so the preview reads like a spec sheet. */
function State({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useNjamTheme();
  return (
    <View style={styles.state}>
      <Text style={[typography.overline, { color: colors.inkSubtle }]}>{label}</Text>
      {children}
    </View>
  );
}

/** One component family: its name as a section heading, then its states. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.block}>
      <SectionHeader variant="simple" headline={title} />
      {children}
    </View>
  );
}

export default function ComponentPreviewScreen() {
  const { colors } = useNjamTheme();
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('milk');
  const [emptySearch, setEmptySearch] = useState('');
  const [carbs, setCarbs] = useState('10');
  const [newPassword, setNewPassword] = useState('');
  const [password, setPassword] = useState('njamnjam');
  const [shortPassword, setShortPassword] = useState('njam1');
  const [recallAlerts, setRecallAlerts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState('severe');
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<'history' | 'saved'>('saved');
  const [vibrate, setVibrate] = useState(true);
  const [scope, setScope] = useState(EVERYONE);
  const [person, setPerson] = useState('anika');
  const [saved, setSaved] = useState(false);
  const [rules, setRules] = useState<string[]>(['Milk', 'Peanut']);
  const [traces, setTraces] = useState(true);
  const [everyoneRules, setEveryoneRules] = useState(false);
  const [carbLimit, setCarbLimit] = useState(10);
  const [torch, setTorch] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(true);
  const [tab, setTab] = useState<TabKey>('home');

  const toggleRule = (rule: string) =>
    setRules((current) => (current.includes(rule) ? current.filter((r) => r !== rule) : [...current, rule]));

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

        <Section title="Buttons">
          <State label="Primary, large: the one action at the foot of a screen">
            <Button label="Save my allergies" size="large" fullWidth onPress={() => {}} />
          </State>
          <State label="Primary, default: tap to see loading">
            <Button
              label="Scan a barcode"
              icon="barcode_scanner"
              fullWidth
              loading={loading}
              loadingLabel="Checking 6 rules"
              onPress={fakeCheck}
            />
          </State>
          <State label="Secondary and outlined">
            <View style={styles.row}>
              <Button label="See alternatives" icon="swap_horiz" variant="secondary" onPress={() => {}} />
              <Button label="Skip for now" variant="outlined" onPress={() => {}} />
            </View>
          </State>
          <State label="Tonal, small">
            <Button label="Add a rule" icon="add" variant="tonal" size="small" onPress={() => {}} />
          </State>
          <State label="Text: an inline escape, no fill">
            <Button label="Not now" variant="text" onPress={() => {}} />
          </State>
          <State label="Danger: only inside a dialog or sheet">
            <Button label="Delete" variant="danger" onPress={() => {}} />
          </State>
          <State label="Disabled">
            <Button label="Scan a barcode" disabled onPress={() => {}} />
          </State>
        </Section>

        <Section title="Icon buttons">
          <State label="Tonal: back, notifications, more">
            <View style={styles.row}>
              <IconButton icon="chevron_left" variant="tonal" accessibilityLabel="Back" onPress={() => {}} />
              <IconButton icon="notifications" variant="tonal" accessibilityLabel="Notifications" onPress={() => {}} />
              <IconButton icon="more_horiz" variant="tonal" accessibilityLabel="More options" onPress={() => {}} />
            </View>
          </State>
          <State label="Filled: the one strong action">
            <IconButton icon="tune" variant="filled" accessibilityLabel="Filters" onPress={() => {}} />
          </State>
          <State label="Standard: rest and selected (filled)">
            <View style={styles.row}>
              <IconButton icon="bookmark" accessibilityLabel="Save" onPress={() => {}} />
              <IconButton icon="bookmark" selected accessibilityLabel="Saved" onPress={() => {}} />
            </View>
          </State>
          <State label="Disabled">
            <IconButton icon="delete" variant="tonal" disabled accessibilityLabel="Delete" onPress={() => {}} />
          </State>
        </Section>

        <Section title="Choices">
          <State label="Option buttons: rest and selected (pick one)">
            <View style={styles.row}>
              <OptionButton label="Avoid" icon="do_not_disturb_on" selected={severity === 'avoid'} onPress={() => setSeverity('avoid')} />
              <OptionButton label="Moderate" icon="error" selected={severity === 'moderate'} onPress={() => setSeverity('moderate')} />
              <OptionButton label="Severe" icon="emergency" selected={severity === 'severe'} onPress={() => setSeverity('severe')} />
            </View>
          </State>
          <State label="Segmented control: tap, or hold and drag">
            <SegmentedControl
              segments={[
                { value: 'history', label: 'History' },
                { value: 'saved', label: 'Saved' },
              ]}
              value={view}
              onChange={setView}
            />
          </State>
          <State label="Filter chips: active and rest">
            <View style={styles.row}>
              {['all', 'safe', 'check', 'not safe'].map((f) => (
                <FilterChip key={f} label={f[0].toUpperCase() + f.slice(1)} active={filter === f} onPress={() => setFilter(f)} />
              ))}
            </View>
          </State>
          <State label="Dropdown chips: rest and selected">
            <View style={styles.row}>
              <DropdownChip verdicts={['safe', 'caution', 'unsafe']} accessibilityLabel="Showing Safe, Check and Not safe" onPress={() => {}} />
              <DropdownChip label="Safe only" verdicts={['safe']} selected onPress={() => {}} />
              <DropdownChip label="Category" onPress={() => {}} />
            </View>
          </State>
          <State label="Rule chips: chosen with severity, chosen, not chosen">
            <View style={styles.row}>
              <RuleChip label="Milk" severity="severe" selected={rules.includes('Milk')} onToggle={() => toggleRule('Milk')} />
              <RuleChip label="Peanut" severity="moderate" selected={rules.includes('Peanut')} onToggle={() => toggleRule('Peanut')} />
              <RuleChip label="Halal" selected={rules.includes('Halal')} onToggle={() => toggleRule('Halal')} />
              <RuleChip label="Egg" selected={rules.includes('Egg')} onToggle={() => toggleRule('Egg')} />
            </View>
          </State>
          <State label="Checkboxes: ticked and unticked">
            <ListGroup>
              <Checkbox label='Warn me about "may contain" traces' checked={traces} onChange={setTraces} />
              <Checkbox label="Apply these rules to everyone at home" checked={everyoneRules} onChange={setEveryoneRules} />
            </ListGroup>
          </State>
          <State label="Slider: drag or tap the track">
            <Slider label="Carbs per serving" value={carbLimit} onChange={setCarbLimit} min={0} max={30} unit="g" />
          </State>
          <State label="Step progress">
            <StepProgress step={2} total={6} />
          </State>
        </Section>

        <Section title="Fields">
          <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
            Tap into any field to see its active state.
          </Text>
          <State label="Search: empty">
            <TextField variant="search" label="Search products" value={emptySearch} onChangeText={setEmptySearch} placeholder="Search milk, rusks, bread" />
          </State>
          <State label="Search: with text and a clear button">
            <TextField
              variant="search"
              label="Search products"
              value={search}
              onChangeText={setSearch}
              trailingIcon={search ? 'close' : undefined}
              trailingLabel="Clear search"
              onTrailingPress={() => setSearch('')}
            />
          </State>
          <State label="Rest, with helper text">
            <TextField
              label="Email"
              leadingIcon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.co.za"
              keyboardType="email-address"
              autoCapitalize="none"
              helper="The one you use for Njam."
            />
          </State>
          <State label="Numeric, with a unit">
            <TextField label="Carbs per serving" leadingIcon="nutrition" variant="numeric" unit="g" value={carbs} onChangeText={setCarbs} />
          </State>
          <State label="Password: empty">
            <TextField label="Password" leadingIcon="lock" value={newPassword} onChangeText={setNewPassword} placeholder="At least 8 characters" secureTextEntry />
          </State>
          <State label="Password: filled (tap the eye to show it)">
            <TextField label="Password" leadingIcon="lock" value={password} onChangeText={setPassword} secureTextEntry />
          </State>
          <State label="Password: error">
            <TextField
              label="Password"
              leadingIcon="lock"
              value={shortPassword}
              onChangeText={setShortPassword}
              secureTextEntry
              error="Use at least 8 characters."
            />
          </State>
          <State label="Disabled">
            <TextField label="Password" leadingIcon="lock" value="njamnjam" onChangeText={() => {}} secureTextEntry disabled />
          </State>
        </Section>

        <Section title="Verdicts">
          <State label="Verdict chips: filled">
            <View style={styles.row}>
              <VerdictChip state="safe" />
              <VerdictChip state="caution" />
              <VerdictChip state="unsafe" />
            </View>
          </State>
          <State label="Verdict chips: outlined">
            <View style={styles.row}>
              <VerdictChip state="safe" variant="outlined" />
              <VerdictChip state="caution" variant="outlined" />
              <VerdictChip state="unsafe" variant="outlined" />
            </View>
          </State>
          <State label="Verdict card: Not safe">
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
          </State>
          <State label="Verdict card: Caution">
            <VerdictBanner
              state="caution"
              headline="Check this one"
              reasons={[{ icon: 'nutrition', text: 'Carbs are 9.1 g per serving, close to your 10 g limit.' }]}
              sourceNote="Read from the label photo, not yet verified."
            />
          </State>
          <State label="Verdict card: Safe">
            <VerdictBanner
              state="safe"
              headline="Safe for everyone"
              reasons={[{ icon: 'task_alt', text: 'No milk, no peanut, no sulphites. All 6 rules passed.' }]}
              sourceNote="Verified record."
            />
          </State>
          <State label="Per person: selected and rest">
            <View style={styles.row}>
              <MemberVerdict name="Anika" verdict="unsafe" selected={person === 'anika'} onPress={() => setPerson('anika')} />
              <MemberVerdict name="Thabo" verdict="caution" selected={person === 'thabo'} onPress={() => setPerson('thabo')} />
              <MemberVerdict name="Lindi" verdict="safe" selected={person === 'lindi'} onPress={() => setPerson('lindi')} />
            </View>
          </State>
        </Section>

        <Section title="Rows">
          <State label="Chevron, value, switch, destructive">
            <ListGroup>
              <ListRow icon="no_food" title="Allergies and severity" supporting="Milk severe, egg moderate" value="2" onPress={() => {}} />
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
          </State>
          <State label="Icon badges: strong and soft">
            <ListGroup>
              <ListRow icon="person" iconBadge="strong" title="Anika" supporting="Milk severe, halal" onPress={() => {}} />
              <ListRow icon="vibration" iconBadge="soft" title="Vibrate on Not safe" trailing="switch" switchValue={vibrate} onSwitchChange={setVibrate} />
            </ListGroup>
          </State>
          <State label="Expand, with a verdict line">
            <ListGroup>
              <ListRow
                icon="list_alt"
                iconBadge="soft"
                title="Ingredients"
                supporting="2 flagged: milk, E322"
                supportingVerdict="unsafe"
                trailing="expand"
                expanded={expanded}
                onPress={() => setExpanded(!expanded)}
              />
            </ListGroup>
          </State>
        </Section>

        <Section title="Products">
          <SectionHeader variant="shelf" headline="Recent scans" actionLabel="View all" onAction={() => {}} />
          <State label="Product tiles: saved and not saved">
            <View style={styles.row}>
              <ProductTile name="Ouma Rusks Buttermilk" verdict="unsafe" saved={saved} onPress={() => {}} onToggleSave={() => setSaved(!saved)} />
              <ProductTile name="[PRODUCT NAME]" verdict="caution" onPress={() => {}} onToggleSave={() => {}} />
            </View>
          </State>
          <State label="Product card: row">
            <ProductCard name="[OAT MILK]" detail="[BRAND · 1 L]" verdict="safe" onPress={() => {}} />
          </State>
          <State label="Product card: identity">
            <ProductCard name="Ouma Rusks Buttermilk" detail="Ouma · 500 g" variant="identity" metaIcon="verified" metaText="Verified" />
          </State>
          <State label="Photo steps: done and to do">
            <PhotoStepCard step="Photo 1" title="Front of the pack" supporting="So others can find it" photo={SAMPLE_PHOTO} onTakePhoto={() => {}} />
            <PhotoStepCard step="Photo 2" title="Nutrition and ingredients" supporting="The whole panel, flat and in focus" onTakePhoto={() => {}} />
          </State>
        </Section>

        <Section title="Household and scanner">
          <State label="Household bar: tap, or hold and drag">
            <HouseholdBar
              members={[
                { id: 'anika', name: 'Anika' },
                { id: 'thabo', name: 'Thabo' },
              ]}
              selectedId={scope}
              onSelect={setScope}
            />
          </State>
          <State label="Camera panel: scope pill, torch, hint, fallback">
            <View style={styles.scanner}>
              <ScanFrame
                scope={<ScopePill people={['Anika', 'Thabo', 'Lindi']} label="Checking for 3 people" onPress={() => {}} />}
                torchOn={torch}
                onToggleTorch={() => setTorch(!torch)}
                hint="Point at a barcode. It scans by itself."
                bottomAction={<Button label="Type the barcode instead" icon="keyboard" variant="outlined" onPress={() => {}} />}
              />
            </View>
          </State>
        </Section>

        <Section title="Ask Njam">
          <State label="AI avatar">
            <AiAvatar />
          </State>
          <State label="Assistant and user bubbles">
            <View style={styles.chat}>
              <ChatBubble from="assistant" text="Hi Anika. Ask me about any product or ingredient and I will check it against your rules." />
              <ChatBubble from="user" text="Is there a rusk I can eat with my milk allergy?" />
            </View>
          </State>
          <State label="Composer: send is disabled until you type">
            <ChatComposer placeholder="Ask about a product or ingredient" onSend={() => {}} />
          </State>
        </Section>

        <Section title="Feedback">
          <State label="Empty state">
            <EmptyState
              icon="barcode_scanner"
              headline="No scans yet"
              body="Scan your first product and it will show up here with its verdict."
              actionLabel="Scan a barcode"
              onAction={() => {}}
            />
          </State>
          <State label="Snackbar: neutral, with an action">
            {showSnackbar ? (
              <Snackbar message="Added to your saved products" actionLabel="Undo" onAction={() => setShowSnackbar(false)} />
            ) : (
              <Button label="Show the snackbar again" variant="tonal" size="small" onPress={() => setShowSnackbar(true)} />
            )}
          </State>
          <State label="Snackbar: warning and failure">
            <Snackbar kind="warning" message="You are offline. Scans will wait." />
            <Snackbar kind="failure" message="We could not check that barcode." actionLabel="Retry" onAction={() => {}} />
          </State>
          <State label="Confirm dialog: tap to open">
            <Button label="Delete Thabo's profile" variant="tonal" icon="delete" onPress={() => setDialogOpen(true)} />
          </State>
          <ConfirmDialog
            visible={dialogOpen}
            icon="delete"
            title="Delete Thabo's profile?"
            body="His 6 rules and scan history go too. This cannot be undone."
            cancelLabel="Keep profile"
            confirmLabel="Delete"
            onCancel={() => setDialogOpen(false)}
            onConfirm={() => setDialogOpen(false)}
          />
        </Section>

        <Section title="Navigation">
          <State label="Tab bar: tap a tab, or hold and drag along the bar">
            <TabBar active={tab} onSelect={setTab} floating={false} />
          </State>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingVertical: space.s6,
    gap: space.s12,
  },
  block: {
    gap: space.s6,
  },
  state: {
    gap: space.s2,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.s2,
  },
  chat: {
    gap: space.s3,
  },
  // A fixed-height stand-in for the scanner screen's camera area.
  scanner: {
    height: layout.scanFrameHeight * 3,
  },
});
