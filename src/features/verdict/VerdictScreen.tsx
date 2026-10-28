/**
 * Verdict: Safe, Caution or Not safe for one product, and why.
 *
 * It opens three ways, named by its route params:
 *   productId - a product from the catalogue (search, or a barcode scan).
 *   label     - an ingredient list the AI just read from a label photo (JSON
 *               of a LabelRead), with the barcode it was scanned under if
 *               there was one.
 *               `photo` is the photo just taken (a file on the phone), shown
 *               in place of a packshot, since a label read is not saved.
 *   scanId    - a past scan from History, shown exactly as it was decided.
 *
 * Layout (the Results screens in Figma, 14 Oct 2026, with tabs from
 * 18 Oct): back and "For Thabo" at the top, then the verdict tab ("Not safe
 * for Thabo") with a paper drawer over it. The drawer holds the product
 * heading and the packshot, then three tabs:
 *   Verdict     - the rules card, "Who can eat it" (everyone in the
 *                 household, tap one to see their result), and for a Not
 *                 safe product, "See alternatives" (Safe products of the
 *                 same kind, see src/features/alternatives).
 *   Ingredients - the ingredient list, with what broke a rule picked out.
 *   Nutrition   - the nutrition table, open.
 * "Available at" sits under every tab.
 *
 * Scrolling: the drawer is the content of a scroll view whose window starts
 * just under the tab's label. At rest the drawer sits DRAWER_TRAVEL lower,
 * so the label shows. Scroll, and the drawer slides up over the label until
 * its top meets the window's edge; from there the window clips it and the
 * content carries on scrolling inside the drawer. No animation code is
 * needed: the native scroll moves the drawer, and the window stops it.
 *
 * "For Thabo" (top right) switches whose rules the verdict is shown for.
 * The engine decides again with that person's rules; nothing is saved. The
 * scan is recorded once, against the household's default profile, as the
 * scanner's scope pill showed. A past scan has no switch: it shows what was
 * decided at the time, for the person it was decided for.
 *
 * This screen only shows the verdict. The verdict engine decides it, and
 * the engine flags anything our team has not checked (capped at Caution for
 * a severe allergy), and decides a complete Open Food Facts list like a
 * checked one.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/Screen';
import {
  Button,
  DropdownChip,
  EmptyState,
  Icon,
  IconButton,
  LoadingMark,
  SegmentedControl,
  Snackbar,
  TopBar,
  useTopBarHeight,
  type VerdictReason,
} from '@/components/design-system';
import { AskNjamButton } from '@/features/ask-njam/AskNjamHeader';
import { useAuth, type Member } from '@/features/auth/AuthProvider';
import { fetchSavedProductIds, saveProduct, unsaveProduct } from '@/features/home/saved-products';
import { fetchStoresForProduct, type StoreForProduct } from '@/features/home/stores';
import { fetchHouseholdProfiles, type ActiveProfile } from '@/features/profile/active-profile';
import { fetchProductById, ingredientNames } from '@/features/verdict/catalogue';
import { AvailableAt } from '@/features/verdict/AvailableAt';
import { IngredientsCard } from '@/features/verdict/IngredientsCard';
import { fetchNutrition, type Nutrition } from '@/features/verdict/nutrition';
import { NutritionCard } from '@/features/verdict/NutritionCard';
import { ProductHeading } from '@/features/verdict/ProductHeading';
import { ProfilePicker } from '@/features/verdict/ProfilePicker';
import { PastRulesCard, RulesCard, rulesSummary } from '@/features/verdict/RulesCard';
import { fetchScan, recordScan } from '@/features/verdict/scans';
import { DRAWER_TRAVEL, TAB_PEEK_SCROLLED, VerdictTab } from '@/features/verdict/VerdictTab';
import { WhoCanEatIt } from '@/features/verdict/WhoCanEatIt';
import type { LabelRead } from '@/services/ai';
import { decideVerdict, type RuleCheck, type VerdictProduct, type VerdictState } from '@/services/verdict';
import { icon, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Params = {
  productId?: string;
  label?: string;
  barcode?: string;
  photo?: string;
  scanId?: string;
};

/**
 * Where an unverified product's ingredient list came from, under its name.
 * A complete Open Food Facts list is decided like a verified one (see
 * isCompleteList in the verdict engine), so its note only says where it is from.
 */
const SOURCE_NOTES = {
  labelPhoto: 'Read from your photo. Not yet checked by our team.',
  openFoodFacts: 'From Open Food Facts, a public database of real labels that anyone can edit.',
};

/** The verdict word, at the start of the tab: "Not safe for Thabo". */
const STATE_WORDS: Record<VerdictState, string> = {
  safe: 'Safe',
  caution: 'Caution',
  unsafe: 'Not safe',
};

/** The three tabs in the drawer, under the packshot. */
type ResultTab = 'verdict' | 'ingredients' | 'nutrition';

const RESULT_TABS: { value: ResultTab; label: string }[] = [
  { value: 'verdict', label: 'Verdict' },
  { value: 'ingredients', label: 'Ingredients' },
  { value: 'nutrition', label: 'Nutrition' },
];

/** What the screen shows about the product, whoever it is viewed for. */
type Subject = {
  name: string;
  /** The overline above the name. */
  brand: string | null;
  /** "1000 ml", or null when the pack size is not known. */
  size: string | null;
  barcode: string | null;
  imageUrl: string | null;
  /** In label order. Empty for a past label read that was never added. */
  ingredients: string[];
  /** Where the ingredient list came from, when nobody has verified it. */
  note: string | null;
};

/**
 * What only a catalogue product has: an id to save, a nutrition table and
 * stores. A label read or a past scan has none of these.
 */
type CatalogueExtras = {
  productId: string;
  /** Its aisle, which "See alternatives" falls back to. null when it has none. */
  categoryId: string | null;
  saved: boolean;
  /** null when the label's nutrition table is not in the catalogue yet. */
  nutrition: Nutrition | null;
  stores: StoreForProduct[];
};

/** A product the engine can check against anyone in the household. */
type Live = {
  kind: 'live';
  subject: Subject;
  product: VerdictProduct;
  /** Default profile first. */
  profiles: ActiveProfile[];
  /** null for a label read, or when the extras could not be loaded. */
  extras: CatalogueExtras | null;
};

/** A past scan: the decision as it was made, for the person it was made for. */
type Past = {
  kind: 'past';
  subject: Subject;
  state: VerdictState;
  reasons: VerdictReason[];
  profileName: string;
  /** The product's nutrition table, when the scan links to a catalogue product. */
  nutrition: Nutrition | null;
  /** "Scanned 14/10/2026, 09:12. Your rules may have changed since." */
  sourceNote: string;
};

type Status =
  | { kind: 'loading' }
  | { kind: 'shown'; shown: Live | Past }
  | { kind: 'unreadable'; problem: string }
  | { kind: 'failed' };

/** "1000 ml", or null. */
function packSize(size: number | null, unit: string | null): string | null {
  return size && unit ? `${size} ${unit}` : null;
}

/**
 * The saved state, nutrition and stores for a catalogue product. These are
 * extras: if any of them fails to load, the verdict still shows, without them.
 */
async function loadExtras(productId: string, categoryId: string | null): Promise<CatalogueExtras | null> {
  try {
    const [saved, nutrition, stores] = await Promise.all([
      fetchSavedProductIds(),
      fetchNutrition(productId),
      fetchStoresForProduct(productId),
    ]);
    return { productId, categoryId, saved: saved.has(productId), nutrition, stores };
  } catch (error) {
    console.warn('Could not load the nutrition, stores or saved state', error);
    return null;
  }
}

/** A catalogue product: load it, and record the scan against the default profile. */
async function loadProduct(productId: string, barcode: string | undefined, member: Member, profiles: ActiveProfile[]) {
  const product = await fetchProductById(productId);
  if (!product) throw new Error('Product not found');
  const extras = await loadExtras(productId, product.categoryId);

  const checked: VerdictProduct = {
    verified: product.verified,
    readFromLabel: false,
    fromOpenFoodFacts: product.source === 'open_food_facts',
    ingredients: product.ingredients,
    mayContain: product.mayContain,
    // No nutrition table (or it failed to load) leaves nutrient limits at Caution.
    nutrition: extras?.nutrition?.facts ?? null,
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
      brand: product.brand,
      size: packSize(product.servingSize, product.servingUnit),
      barcode: product.barcode,
      imageUrl: product.imageUrl,
      ingredients: ingredientNames(product),
      note: product.verified
        ? null
        : product.source === 'ai_label_read'
          ? 'Read from a label photo. Not yet checked by our team.'
          : product.source === 'open_food_facts'
            ? SOURCE_NOTES.openFoodFacts
            : 'Added by a shopper. Not yet checked by our team.',
    },
    product: checked,
    profiles,
    extras,
  };
  return live;
}

/** An ingredient list the AI just read from a photo: record the scan if it had a barcode. */
async function loadLabel(
  read: LabelRead,
  barcode: string | undefined,
  photoUri: string | undefined,
  member: Member,
  profiles: ActiveProfile[],
) {
  const checked: VerdictProduct = {
    verified: false,
    readFromLabel: true,
    readConfidence: read.confidence,
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
      name: read.productName ?? 'Product from a label photo',
      brand: null,
      size: null,
      barcode: barcode ?? null,
      imageUrl: photoUri ?? null,
      ingredients: read.ingredients.map((item) => item.name),
      note: SOURCE_NOTES.labelPhoto,
    },
    product: checked,
    profiles,
    extras: null,
  };
  return live;
}

/**
 * A past scan: its verdict and reasons as they were stored, with the
 * ingredients and nutrition read again from the product it links to. A
 * label read that was never added has no product, so it shows the verdict only.
 */
async function loadPastScan(scanId: string) {
  const scan = await fetchScan(scanId);
  if (!scan) throw new Error('Scan not found');
  const product = scan.productId ? await fetchProductById(scan.productId).catch(() => null) : null;
  const nutrition = product ? await fetchNutrition(product.id).catch(() => null) : null;
  const past: Past = {
    kind: 'past',
    subject: {
      name: scan.productName ?? 'Product from a label photo',
      brand: scan.productBrand,
      size: null,
      barcode: scan.barcode,
      imageUrl: scan.productImageUrl,
      ingredients: product ? ingredientNames(product) : [],
      note: null,
    },
    state: scan.verdict,
    reasons: scan.reasons,
    profileName: scan.profileName ?? 'your profile',
    nutrition,
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
        const live = await loadLabel(
          read,
          params.barcode,
          params.photo,
          current,
          profiles,
        );
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
  }, [member, params.productId, params.label, params.barcode, params.photo, params.scanId, attempt]);

  return (
    // The result fills the whole screen edge to edge, so it skips Screen's
    // gutter and top and bottom room and lays itself out (see Shown).
    status.kind === 'shown' ? (
      <Shown shown={status.shown} />
    ) : (
      <Screen scroll={false} topBar={{ onBack: () => router.back() }}>
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
      </Screen>
    )
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

/**
 * The loaded screen: the top bar, the verdict tab, and the paper drawer over
 * it. Who the verdict is viewed for, and whether the product is saved, live here.
 */
function Shown({ shown }: { shown: Live | Past }) {
  const { colors, shadows } = useNjamTheme();
  const insets = useSafeAreaInsets();
  // Who the verdict is shown for. Starts on the default profile, which is
  // the one the scan was recorded against.
  const [viewingId, setViewingId] = useState<string | null>(shown.kind === 'live' ? shown.profiles[0].id : null);
  const [picking, setPicking] = useState(false);
  const [tab, setTab] = useState<ResultTab>('verdict');
  const extras = shown.kind === 'live' ? shown.extras : null;
  const [saved, setSaved] = useState(extras?.saved ?? false);
  const [saveFailed, setSaveFailed] = useState(false);
  const topBarHeight = useTopBarHeight();

  /** Saves or unsaves at once on screen, and puts it back if the database says no. */
  function toggleSave(productId: string) {
    const wasSaved = saved;
    setSaved(!wasSaved);
    (wasSaved ? unsaveProduct(productId) : saveProduct(productId)).catch(() => {
      setSaved(wasSaved);
      setSaveFailed(true);
    });
  }

  // Decide for whoever is selected. For a past scan, use what was stored.
  let state: VerdictState;
  let profileName: string;
  let checks: RuleCheck[] = [];
  let viewingDefault = false;
  let picker: { name: string; options: { id: string; name: string; verdict: VerdictState }[] } | null = null;

  if (shown.kind === 'live') {
    const viewing = shown.profiles.find((profile) => profile.id === viewingId) ?? shown.profiles[0];
    const verdict = decideVerdict(shown.product, viewing.rules);
    state = verdict.state;
    checks = verdict.checks;
    profileName = viewing.name;
    viewingDefault = viewing.id === shown.profiles[0].id;
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
    profileName = shown.profileName;
  }

  const { subject } = shown;
  const rulesTitle = `${profileName}'s rules`;
  const summary = shown.kind === 'live' ? rulesSummary(checks, state) : shown.sourceNote;
  // The ingredients that broke a rule, or may break one, to pick out in the list.
  const highlighted = checks.filter((check) => check.outcome === 'broken').flatMap((check) => check.matched);
  const cautioned = checks.filter((check) => check.outcome === 'unchecked').flatMap((check) => check.matched);

  // "See alternatives" opens Safe products of the same kind. They are checked
  // against the default profile, so it is only offered while viewing that
  // profile: for anyone else it would show the wrong person's verdicts.
  // Only for Not safe: a Caution says what is unknown, and "Who can eat it"
  // takes the button's place (Figma, 18 Oct 2026).
  const offerAlternatives = state === 'unsafe' && viewingDefault && extras !== null;

  const rules =
    shown.kind === 'live' ? (
      <RulesCard title={rulesTitle} checks={checks} state={state} />
    ) : (
      <PastRulesCard title={rulesTitle} summary={shown.sourceNote} reasons={shown.reasons} state={state} />
    );
  const alternatives =
    offerAlternatives && extras ? (
      <Button
        label="See alternatives"
        icon="swap_horiz"
        variant="secondary"
        size="large"
        fullWidth
        onPress={() =>
          router.push({
            pathname: '/alternatives',
            params: {
              productId: extras.productId,
              name: subject.name,
              ...(extras.categoryId ? { categoryId: extras.categoryId } : {}),
            },
          })
        }
      />
    ) : null;
  // A label read, or a product with no nutrition table yet: the card says so.
  const nutrition = (
    <NutritionCard nutrition={shown.kind === 'past' ? shown.nutrition : (extras?.nutrition ?? null)} startOpen />
  );
  // No stores known yet: leave "Available at" out rather than say we do not know.
  const stores =
    extras && extras.stores.length > 0 ? <AvailableAt stores={extras.stores} edgeInset={space.s6} /> : null;
  const ingredients =
    subject.ingredients.length > 0 ? (
      <IngredientsCard
        ingredients={subject.ingredients}
        highlighted={highlighted}
        cautioned={cautioned}
        note={subject.note}
      />
    ) : (
      // A past label read that was never added (no barcode, or scanned before
      // every scan added its product): no product to read the list from again.
      <Text style={[typography.body, { color: colors.inkMuted }]}>
        This product was not added to Njam, so we kept its verdict and reasons but not the ingredient list.
      </Text>
    );
  // Everyone in the household, for a live result. Left out when you are the
  // only person, where it would just repeat the verdict above.
  const who =
    picker && viewingId && picker.options.length > 1 ? (
      <WhoCanEatIt
        people={picker.options}
        selectedId={viewingId}
        onSelect={setViewingId}
        edgeInset={space.s6}
      />
    ) : null;

  return (
    <View style={[styles.page, { backgroundColor: colors.surface }]}>
      {/* Everything from the verdict tab down. */}
      <View style={[styles.stage, { marginTop: topBarHeight + space.s6 }]}>
        <VerdictTab state={state} label={`${STATE_WORDS[state]} for ${profileName}`} summary={summary} />
        {/* Paper behind the lower half, so pulling past the end of the drawer shows paper, not the tab. */}
        <View style={[styles.paperUnder, { backgroundColor: colors.brandPaper }]} />

        {/* The window the drawer scrolls in. Its top edge is where the drawer stops. */}
        <View style={styles.window}>
          <ScrollView contentContainerStyle={styles.windowContent}>
            <View
              style={[
                styles.drawer,
                shadows.sheet,
                { backgroundColor: colors.brandPaper, paddingBottom: space.s8 + insets.bottom },
              ]}>
              <View style={[styles.column, styles.drawerContent]}>
                <ProductHeading
                  name={subject.name}
                  brand={subject.brand}
                  size={subject.size}
                  barcode={subject.barcode}
                  state={state}
                />
                <ProductPhoto
                  imageUrl={subject.imageUrl}
                  name={subject.name}
                  saved={saved}
                  onToggleSave={extras ? () => toggleSave(extras.productId) : undefined}
                />

                <SegmentedControl segments={RESULT_TABS} value={tab} onChange={setTab} />

                {tab === 'verdict' && (
                  <>
                    {rules}
                    {who}
                    {alternatives}
                  </>
                )}
                {tab === 'ingredients' && ingredients}
                {tab === 'nutrition' && nutrition}

                {stores}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* After the stage, so it is drawn over it: the bar floats, and React
          Native paints later siblings on top. Drawn first, the drawer covered
          "For ..." and "Ask Njam" and the fade under the bar. */}
      <TopBar
        onBack={() => router.back()}
        trailing={
          <>
            {picker && (
              <DropdownChip
                label={`For ${picker.name}`}
                accessibilityLabel={`Viewing for ${picker.name}. Change who this is checked for.`}
                onPress={() => setPicking(true)}
              />
            )}
            <AskNjamButton />
          </>
        }
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

      {saveFailed && (
        <Snackbar
          kind="failure"
          message="We could not change your saved products. Check your connection."
          onDismiss={() => setSaveFailed(false)}
        />
      )}
    </View>
  );
}

/**
 * The front of the pack, or an empty well when nobody has photographed it.
 * A catalogue product gets a save button in the lower right, as on Home.
 */
function ProductPhoto({
  imageUrl,
  name,
  saved,
  onToggleSave,
}: {
  imageUrl: string | null;
  name: string;
  saved: boolean;
  onToggleSave?: () => void;
}) {
  const { colors } = useNjamTheme();
  return (
    <View style={[styles.photo, { backgroundColor: colors.surfaceMedia }]}>
      {/* The photo itself is decoration for a screen reader; the name says what it is. */}
      <View
        style={styles.photoFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.photoImage} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : (
          <Icon name="grocery" size="xl" color={colors.inkSubtle} />
        )}
      </View>

      {onToggleSave && (
        <View style={styles.save}>
          <IconButton
            icon="bookmark"
            selected={saved}
            accessibilityLabel={saved ? `Remove ${name} from saved` : `Save ${name}`}
            onPress={onToggleSave}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space.s6,
    paddingBottom: space.s6,
  },
  loading: {
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s12,
  },
  page: {
    flex: 1,
  },
  // Caps the content on tablets; the drawer itself stays full width.
  column: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  // Its marginTop leaves room for the TopBar, which floats over the page.
  stage: {
    flex: 1,
  },
  paperUnder: {
    position: 'absolute',
    top: '50%',
    right: 0,
    bottom: 0,
    left: 0,
  },
  // Starts where the drawer stops, with the drawer's own corners, so the
  // content scrolling under its edge is clipped to the same rounded shape.
  window: {
    position: 'absolute',
    top: TAB_PEEK_SCROLLED,
    right: 0,
    bottom: 0,
    left: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  // At rest the drawer sits DRAWER_TRAVEL down, so the tab's label shows above it.
  windowContent: {
    flexGrow: 1,
    paddingTop: DRAWER_TRAVEL,
  },
  // The paper drawer, the same sheet as Log in and Sign up: xl corners on top only.
  drawer: {
    flexGrow: 1,
    paddingHorizontal: space.s6,
    paddingTop: space.s8,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  drawerContent: {
    gap: space.s6,
  },
  photo: {
    height: layout.productPhotoHeight,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  save: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
});
