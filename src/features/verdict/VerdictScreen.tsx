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
 * This screen only shows the verdict. The verdict engine decides it, and
 * the engine caps anything read from a label at Caution.
 *
 * Until the BottomSheet component is built, the verdict is a full screen
 * rather than a sheet.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import {
  Button,
  EmptyState,
  IconButton,
  LoadingMark,
  ProductCard,
  SectionHeader,
  VerdictBanner,
  type VerdictReason,
} from '@/components/design-system';
import { useAuth, type Member } from '@/features/auth/AuthProvider';
import { fetchActiveProfile, type ActiveProfile } from '@/features/profile/active-profile';
import { fetchProductById, productDetail } from '@/features/verdict/catalogue';
import { fetchScan, recordScan } from '@/features/verdict/scans';
import type { LabelRead } from '@/services/ai';
import { decideVerdict, type VerdictState } from '@/services/verdict';
import { icon, layout, space, typography } from '@/theme/tokens';
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

/** Everything the screen draws once the verdict is known. */
type Shown = {
  state: VerdictState;
  headline: string;
  reasons: VerdictReason[];
  sourceNote: string;
  productName: string;
  detail: string;
  metaIcon: string;
  metaText: string;
  /** In label order. Empty for a past scan, which stores only its reasons. */
  ingredients: string[];
};

type Status =
  | { kind: 'loading' }
  | { kind: 'shown'; shown: Shown }
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

/** A catalogue product: load it, decide, and record the scan. */
async function showProduct(productId: string, barcode: string | undefined, member: Member, profile: ActiveProfile) {
  const product = await fetchProductById(productId);
  if (!product) throw new Error('Product not found');

  const verdict = decideVerdict(
    { verified: product.verified, readFromLabel: false, ingredients: product.ingredients, mayContain: [] },
    profile.rules,
  );

  await recordScan({
    userId: member.id,
    profileId: profile.id,
    productId: product.id,
    barcode: barcode ?? product.barcode,
    verdict: verdict.state,
    reasons: verdict.reasons,
  }).catch((error) => console.warn('Could not save this scan to your history', error));

  const shown: Shown = {
    state: verdict.state,
    headline: headlineFor(verdict.state, profile.name),
    reasons: verdict.reasons,
    sourceNote: rulesNote(verdict.rulesChecked, profile.name),
    productName: product.name,
    detail: productDetail(product),
    metaIcon: product.verified ? 'verified' : 'info',
    metaText: product.verified
      ? 'Verified'
      : product.source === 'ai_label_read'
        ? 'Read from a label photo, not yet verified'
        : 'Added by a shopper, not yet verified',
    ingredients: product.ingredients.map((item) => item.name),
  };
  return shown;
}

/** An ingredient list the AI just read: decide, and record the scan if it had a barcode. */
async function showLabel(
  read: LabelRead,
  source: LabelSource,
  brand: string | undefined,
  barcode: string | undefined,
  member: Member,
  profile: ActiveProfile,
) {
  const words = SOURCE_WORDS[source];
  const verdict = decideVerdict(
    {
      verified: false,
      readFromLabel: source === 'photo',
      ingredients: read.ingredients.map((item) => ({ ...item, canonicalName: null })),
      mayContain: read.mayContain,
    },
    profile.rules,
  );

  if (barcode) {
    await recordScan({
      userId: member.id,
      profileId: profile.id,
      productId: null,
      barcode,
      verdict: verdict.state,
      reasons: verdict.reasons,
    }).catch((error) => console.warn('Could not save this scan to your history', error));
  }

  const shown: Shown = {
    state: verdict.state,
    headline: headlineFor(verdict.state, profile.name),
    reasons: verdict.reasons,
    sourceNote: words.note,
    productName: read.productName ?? words.fallbackName,
    detail: [brand, barcode ? `Barcode ${barcode}` : 'No barcode'].filter(Boolean).join(' · '),
    metaIcon: 'info',
    metaText: words.meta,
    ingredients: read.ingredients.map((item) => item.name),
  };
  return shown;
}

/** A past scan, as it was stored. */
async function showPastScan(scanId: string) {
  const scan = await fetchScan(scanId);
  if (!scan) throw new Error('Scan not found');
  const profileName = scan.profileName ?? 'your profile';
  const shown: Shown = {
    state: scan.verdict,
    headline: headlineFor(scan.verdict, profileName),
    reasons: scan.reasons,
    sourceNote: `Scanned ${new Date(scan.scannedAt).toLocaleString()}. Your rules may have changed since.`,
    productName: scan.productName ?? 'Product from a label photo',
    detail: [scan.productBrand, `Barcode ${scan.barcode}`].filter(Boolean).join(' · '),
    metaIcon: 'history',
    metaText: 'From your scan history',
    ingredients: [],
  };
  return shown;
}

export function VerdictScreen() {
  const { colors } = useNjamTheme();
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
      if (params.scanId) return { kind: 'shown', shown: await showPastScan(params.scanId) };

      const profile = await fetchActiveProfile(householdId);
      if (!profile) throw new Error('No diet profile');

      if (params.label) {
        const read = JSON.parse(params.label) as LabelRead;
        if (!read.readable) {
          return { kind: 'unreadable', problem: read.problem ?? 'We could not read an ingredient list.' };
        }
        return { kind: 'shown', shown: await showLabel(
            read,
            params.source ?? 'photo',
            params.brand,
            params.barcode,
            current,
            profile,
          ) };
      }

      if (params.productId) {
        return { kind: 'shown', shown: await showProduct(params.productId, params.barcode, current, profile) };
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
    <Screen>
      <View style={styles.topBar}>
        <IconButton icon="arrow_back" accessibilityLabel="Go back" onPress={() => router.back()} />
      </View>

      {status.kind === 'loading' && (
        <View style={styles.loading}>
          <LoadingMark size={icon.sizeLg} color={colors.brandForest} />
          <Text style={[typography.body, { color: colors.inkMuted }]}>Checking your rules</Text>
        </View>
      )}

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

      {status.kind === 'shown' && (
        <>
          <ProductCard
            variant="identity"
            name={status.shown.productName}
            detail={status.shown.detail}
            metaIcon={status.shown.metaIcon}
            metaText={status.shown.metaText}
          />

          <VerdictBanner
            state={status.shown.state}
            headline={status.shown.headline}
            reasons={status.shown.reasons}
            sourceNote={status.shown.sourceNote}
            productName={status.shown.productName}
          />

          {status.shown.ingredients.length > 0 && (
            <View style={styles.block}>
              <SectionHeader variant="simple" headline="Ingredients" />
              <Text style={[typography.body, { color: colors.ink }]}>
                {status.shown.ingredients.join(', ')}
              </Text>
            </View>
          )}

          <Button
            label="Scan another product"
            icon="barcode_scanner"
            size="large"
            fullWidth
            onPress={() => router.navigate('/scan')}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Pull the back button out by the gap between its 48 hit area and its
  // 24 icon, so the icon lines up with the screen gutter.
  topBar: {
    marginLeft: -(layout.touchTargetMin - icon.sizeMd) / 2,
    alignItems: 'flex-start',
  },
  loading: {
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s12,
  },
  block: {
    gap: space.s3,
  },
});
