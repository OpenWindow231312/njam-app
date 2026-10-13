/**
 * Verdict: Safe, Caution or Not safe for one product, and why.
 *
 * It opens three ways, named by its route params:
 *   productId - a product from the catalogue (search, or a barcode scan).
 *   label     - an ingredient list just read by the AI (JSON of a LabelRead),
 *               with the barcode it was scanned under if there was one.
 *               `source` says where the text came from: a label photo (the
 *               default) or Open Food Facts, which also passes a `brand`.
 *   scanId    - a past scan from History, shown exactly as it was decided.
 *
 * Layout, top to bottom: the product photo, the name with the brand and
 * barcode smaller underneath, the verdict (mark, word, headline and reason
 * lines), then the ingredients. "Scan another product" stays pinned to the
 * bottom of the screen however short the content is.
 *
 * "Viewing for" (top right) switches whose rules the verdict is shown for.
 * The engine decides again with that person's rules; nothing is saved. The
 * scan is recorded once, against the household's default profile, as the
 * scanner's scope pill showed. A past scan has no switch: it shows what was
 * decided at the time, for the person it was decided for.
 *
 * This screen only shows the verdict. The verdict engine decides it, and
 * the engine caps anything read from a label at Caution.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import {
  Button,
  DropdownChip,
  EmptyState,
  Icon,
  IconButton,
  LoadingMark,
  SectionHeader,
  VerdictMark,
  type VerdictReason,
} from '@/components/design-system';
import { useAuth, type Member } from '@/features/auth/AuthProvider';
import { fetchHouseholdProfiles, type ActiveProfile } from '@/features/profile/active-profile';
import { fetchProductById } from '@/features/verdict/catalogue';
import { ProfilePicker } from '@/features/verdict/ProfilePicker';
import { fetchScan, recordScan } from '@/features/verdict/scans';
import type { LabelRead } from '@/services/ai';
import { decideVerdict, type VerdictProduct, type VerdictState } from '@/services/verdict';
import { icon, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type LabelSource = 'photo' | 'open-food-facts';

type Params = {
  productId?: string;
  label?: string;
  barcode?: string;
  source?: LabelSource;
  brand?: string;
  scanId?: string;
};

/** How each label source is named on screen. Neither is ever verified. */
const SOURCE_WORDS: Record<LabelSource, { note: string; meta: string; fallbackName: string }> = {
  photo: {
    note: 'Read from the label photo, not yet verified.',
    meta: 'Read from the label photo, not yet verified',
    fallbackName: 'Product from a label photo',
  },
  'open-food-facts': {
    note: 'Found in Open Food Facts, a public database anyone can edit. Not yet verified.',
    meta: 'From Open Food Facts, not yet verified',
    fallbackName: 'Product from Open Food Facts',
  },
};

/** The verdict word, shown above the headline so the state is always in words. */
const STATE_WORDS: Record<VerdictState, string> = {
  safe: 'Safe',
  caution: 'Caution',
  unsafe: 'Not safe',
};

/** What the screen shows about the product, whoever it is viewed for. */
type Subject = {
  name: string;
  /** "Clover · Barcode 6001…": smaller, under the name. */
  detail: string;
  imageUrl: string | null;
  metaIcon: string;
  metaText: string;
  /** In label order. Empty for a past scan, which stores only its reasons. */
  ingredients: string[];
};

/** A product the engine can check against anyone in the household. */
type Live = {
  kind: 'live';
  subject: Subject;
  product: VerdictProduct;
  /** Fixed text under the reasons for a label read; null means "Checked against N rules". */
  sourceNote: string | null;
  /** Default profile first. */
  profiles: ActiveProfile[];
};

/** A past scan: the decision as it was made, for the person it was made for. */
type Past = {
  kind: 'past';
  subject: Subject;
  state: VerdictState;
  reasons: VerdictReason[];
  profileName: string;
  sourceNote: string;
};

type Status =
  | { kind: 'loading' }
  | { kind: 'shown'; shown: Live | Past }
  | { kind: 'unreadable'; problem: string }
  | { kind: 'failed' };

function headlineFor(state: VerdictState, profileName: string): string {
  if (state === 'unsafe') return `Not safe for ${profileName}`;
  if (state === 'caution') return 'Check this one';
  return `Safe for ${profileName}`;
}

function rulesNote(count: number, profileName: string): string {
  return `Checked against ${count} ${count === 1 ? 'rule' : 'rules'} in ${profileName}'s profile.`;
}

/** "Clover · Barcode 6009670531658". */
function detailLine(brand: string | null | undefined, barcode: string | null | undefined): string {
  return [brand, barcode ? `Barcode ${barcode}` : 'No barcode'].filter(Boolean).join(' · ');
}

/** A catalogue product: load it, and record the scan against the default profile. */
async function loadProduct(productId: string, barcode: string | undefined, member: Member, profiles: ActiveProfile[]) {
  const product = await fetchProductById(productId);
  if (!product) throw new Error('Product not found');

  const checked: VerdictProduct = {
    verified: product.verified,
    readFromLabel: false,
    ingredients: product.ingredients,
    mayContain: product.mayContain,
  };
  const verdict = decideVerdict(checked, profiles[0].rules);

  await recordScan({
    userId: member.id,
    profileId: profiles[0].id,
    productId: product.id,
    barcode: barcode ?? product.barcode,
    verdict: verdict.state,
    reasons: verdict.reasons,
  }).catch((error) => console.warn('Could not save this scan to your history', error));

  const live: Live = {
    kind: 'live',
    subject: {
      name: product.name,
      detail: detailLine(product.brand, product.barcode),
      imageUrl: product.imageUrl,
      metaIcon: product.verified ? 'verified' : 'info',
      metaText: product.verified
        ? 'Verified'
        : product.source === 'ai_label_read'
          ? 'Read from a label photo, not yet verified'
          : 'Added by a shopper, not yet verified',
      ingredients: product.ingredients.map((item) => item.name),
    },
    product: checked,
    sourceNote: null,
    profiles,
  };
  return live;
}

/** An ingredient list the AI just read: record the scan if it had a barcode. */
async function loadLabel(
  read: LabelRead,
  source: LabelSource,
  brand: string | undefined,
  barcode: string | undefined,
  member: Member,
  profiles: ActiveProfile[],
) {
  const words = SOURCE_WORDS[source];
  const checked: VerdictProduct = {
    verified: false,
    readFromLabel: source === 'photo',
    ingredients: read.ingredients.map((item) => ({ ...item, canonicalName: null })),
    mayContain: read.mayContain,
  };

  if (barcode) {
    const verdict = decideVerdict(checked, profiles[0].rules);
    await recordScan({
      userId: member.id,
      profileId: profiles[0].id,
      productId: null,
      barcode,
      verdict: verdict.state,
      reasons: verdict.reasons,
    }).catch((error) => console.warn('Could not save this scan to your history', error));
  }

  const live: Live = {
    kind: 'live',
    subject: {
      name: read.productName ?? words.fallbackName,
      detail: detailLine(brand, barcode),
      imageUrl: null,
      metaIcon: 'info',
      metaText: words.meta,
      ingredients: read.ingredients.map((item) => item.name),
    },
    product: checked,
    sourceNote: words.note,
    profiles,
  };
  return live;
}

/** A past scan, as it was stored. */
async function loadPastScan(scanId: string) {
  const scan = await fetchScan(scanId);
  if (!scan) throw new Error('Scan not found');
  const past: Past = {
    kind: 'past',
    subject: {
      name: scan.productName ?? 'Product from a label photo',
      detail: detailLine(scan.productBrand, scan.barcode),
      imageUrl: scan.productImageUrl,
      metaIcon: 'history',
      metaText: 'From your scan history',
      ingredients: [],
    },
    state: scan.verdict,
    reasons: scan.reasons,
    profileName: scan.profileName ?? 'your profile',
    sourceNote: `Scanned ${new Date(scan.scannedAt).toLocaleString()}. Your rules may have changed since.`,
  };
  return past;
}

export function VerdictScreen() {
  const { member } = useAuth();
  const params = useLocalSearchParams<Params>();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // React runs effects twice in development; this keeps it to one saved scan.
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!member?.householdId) return;
    const key = `${params.productId}|${params.label}|${params.scanId}|${attempt}`;
    if (startedFor.current === key) return;
    startedFor.current = key;

    async function load(current: Member, householdId: string): Promise<Status> {
      if (params.scanId) return { kind: 'shown', shown: await loadPastScan(params.scanId) };

      const profiles = await fetchHouseholdProfiles(householdId);
      if (profiles.length === 0) throw new Error('No diet profile');

      if (params.label) {
        const read = JSON.parse(params.label) as LabelRead;
        if (!read.readable) {
          return { kind: 'unreadable', problem: read.problem ?? 'We could not read an ingredient list.' };
        }
        const live = await loadLabel(read, params.source ?? 'photo', params.brand, params.barcode, current, profiles);
        return { kind: 'shown', shown: live };
      }

      if (params.productId) {
        return { kind: 'shown', shown: await loadProduct(params.productId, params.barcode, current, profiles) };
      }
      throw new Error('Nothing to show');
    }

    setStatus({ kind: 'loading' });
    load(member, member.householdId)
      .then(setStatus)
      .catch((error) => {
        console.warn('Could not show the verdict', error);
        setStatus({ kind: 'failed' });
      });
  }, [member, params.productId, params.label, params.barcode, params.source, params.brand, params.scanId, attempt]);

  return (
    <Screen scroll={false}>
      {status.kind === 'shown' ? (
        <Shown shown={status.shown} />
      ) : (
        <>
          <TopBar />
          <ScrollView contentContainerStyle={styles.content}>
            {status.kind === 'loading' && <Loading />}

            {status.kind === 'failed' && (
              <EmptyState
                icon="cloud_off"
                headline="We could not check this product"
                body="Check your connection and try again."
                actionLabel="Try again"
                onAction={() => setAttempt((count) => count + 1)}
              />
            )}

            {status.kind === 'unreadable' && (
              <EmptyState
                icon="photo_camera"
                headline="We could not read this label"
                body={`${status.problem} Take the photo again, flat and in focus.`}
                actionLabel="Retake the photo"
                actionIcon="photo_camera"
                onAction={() => router.back()}
              />
            )}
          </ScrollView>
        </>
      )}
    </Screen>
  );
}

/** The back button, and on the right whatever the screen puts there. */
function TopBar({ right }: { right?: ReactNode }) {
  return (
    <View style={styles.topBar}>
      <View style={styles.back}>
        <IconButton icon="arrow_back" accessibilityLabel="Go back" onPress={() => router.back()} />
      </View>
      {right}
    </View>
  );
}

function Loading() {
  const { colors } = useNjamTheme();
  return (
    <View style={styles.loading}>
      <LoadingMark size={icon.sizeLg} color={colors.brandForest} />
      <Text style={[typography.body, { color: colors.inkMuted }]}>Checking your rules</Text>
    </View>
  );
}

/** The loaded screen: photo, name, verdict, ingredients, and the pinned button. */
function Shown({ shown }: { shown: Live | Past }) {
  const { colors } = useNjamTheme();
  // Who the verdict is shown for. Starts on the default profile, which is
  // the one the scan was recorded against.
  const [viewingId, setViewingId] = useState<string | null>(shown.kind === 'live' ? shown.profiles[0].id : null);
  const [picking, setPicking] = useState(false);

  // Decide for whoever is selected. For a past scan, use what was stored.
  let state: VerdictState;
  let reasons: VerdictReason[];
  let profileName: string;
  let sourceNote: string;
  let picker: { name: string; options: { id: string; name: string; verdict: VerdictState }[] } | null = null;

  if (shown.kind === 'live') {
    const viewing = shown.profiles.find((profile) => profile.id === viewingId) ?? shown.profiles[0];
    const verdict = decideVerdict(shown.product, viewing.rules);
    state = verdict.state;
    reasons = verdict.reasons;
    profileName = viewing.name;
    sourceNote = shown.sourceNote ?? rulesNote(verdict.rulesChecked, viewing.name);
    picker = {
      name: viewing.name,
      options: shown.profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        verdict: decideVerdict(shown.product, profile.rules).state,
      })),
    };
  } else {
    state = shown.state;
    reasons = shown.reasons;
    profileName = shown.profileName;
    sourceNote = shown.sourceNote;
  }

  const headline = headlineFor(state, profileName);
  const { subject } = shown;

  return (
    <>
      <TopBar
        right={
          picker && (
            <DropdownChip
              label={`For ${picker.name}`}
              accessibilityLabel={`Viewing for ${picker.name}. Change who this is checked for.`}
              onPress={() => setPicking(true)}
            />
          )
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <ProductPhoto imageUrl={subject.imageUrl} />

        <View style={styles.identity}>
          <Text accessibilityRole="header" style={[typography.displayM, { color: colors.ink }]}>
            {subject.name}
          </Text>
          <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{subject.detail}</Text>
          <View style={styles.metaRow}>
            <Icon name={subject.metaIcon} size="xs" color={colors.inkMuted} />
            <Text style={[typography.caption, { color: colors.inkMuted }]}>{subject.metaText}</Text>
          </View>
        </View>

        <Verdict state={state} headline={headline} reasons={reasons} sourceNote={sourceNote} />

        {subject.ingredients.length > 0 && (
          <View style={styles.block}>
            <SectionHeader variant="simple" headline="Ingredients" />
            <Text style={[typography.body, { color: colors.ink }]}>{subject.ingredients.join(', ')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Outside the scroll view, so it stays at the bottom however short the content is. */}
      <Button
        label="Scan another product"
        icon="barcode_scanner"
        size="large"
        fullWidth
        onPress={() => router.navigate('/scan')}
      />

      {picker && viewingId && (
        <ProfilePicker
          visible={picking}
          profiles={picker.options}
          selectedId={viewingId}
          onSelect={(id) => {
            setViewingId(id);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}

/** The front of the pack, or an empty well when nobody has photographed it. */
function ProductPhoto({ imageUrl }: { imageUrl: string | null }) {
  const { colors } = useNjamTheme();
  return (
    <View
      style={[styles.photo, { backgroundColor: colors.surfaceMedia }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.photoImage} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <Icon name="grocery" size="xl" color={colors.inkSubtle} />
      )}
    </View>
  );
}

/**
 * The verdict, compact: the shape mark beside the verdict word and the
 * headline, then one line per reason. The state is carried by the mark's
 * shape, the word and the reasons, never by colour alone. Reason icons use
 * the verdict's -ink colour, which is readable on the page.
 */
function Verdict({
  state,
  headline,
  reasons,
  sourceNote,
}: {
  state: VerdictState;
  headline: string;
  reasons: VerdictReason[];
  sourceNote: string;
}) {
  const { colors } = useNjamTheme();
  const ink = { safe: colors.verdictSafeInk, caution: colors.verdictCautionInk, unsafe: colors.verdictUnsafeInk }[state];

  // Read out as one block: "Not safe. Not safe for Lerato. 2 reasons."
  const announcement = [STATE_WORDS[state], headline, `${reasons.length} ${reasons.length === 1 ? 'reason' : 'reasons'}`].join(
    '. ',
  );

  return (
    <View accessible accessibilityLabel={announcement} style={styles.verdict}>
      <View style={styles.verdictHead}>
        <VerdictMark state={state} size={icon.markLg} />
        <View style={styles.flex}>
          <Text style={[typography.overline, { color: ink }]}>{STATE_WORDS[state]}</Text>
          <Text style={[typography.displayS, { color: colors.ink }]}>{headline}</Text>
        </View>
      </View>

      {reasons.map((reason) => (
        <View key={reason.text} style={styles.reasonRow}>
          <Icon name={reason.icon} size="sm" color={ink} />
          <Text style={[typography.body, styles.flex, { color: colors.ink }]}>{reason.text}</Text>
        </View>
      ))}

      <View style={styles.reasonRow}>
        <Icon name="info" size="sm" color={colors.inkMuted} />
        <Text style={[typography.caption, styles.flex, { color: colors.inkMuted }]}>{sourceNote}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Pull the back button out by the gap between its 48 hit area and its
  // 24 icon, so the icon lines up with the screen gutter.
  back: {
    marginLeft: -(layout.touchTargetMin - icon.sizeMd) / 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: space.s6,
    paddingBottom: space.s6,
  },
  loading: {
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s12,
  },
  photo: {
    height: layout.productPhotoHeight,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  identity: {
    gap: space.s1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
  },
  verdict: {
    gap: space.s3,
  },
  verdictHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s3,
  },
  flex: {
    flex: 1,
  },
  block: {
    gap: space.s3,
  },
});
