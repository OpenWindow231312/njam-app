/**
 * Scanner: point the camera at a barcode and get a verdict.
 *
 * Three ways in, tried in this order:
 *   barcode - the camera reads a barcode, we look it up in the catalogue and
 *             open the Verdict screen for that product.
 *   Open Food Facts - a barcode we do not know is looked up in Open Food
 *             Facts, a public database. Its ingredient text is read by the
 *             AI service, and the verdict is capped at Caution.
 *   label   - if neither knows the barcode (or there is none), you
 *             photograph the ingredient list. The AI service reads it and
 *             the Verdict screen shows the result, capped at Caution.
 *
 * Whenever a barcode is not in our catalogue (found in Open Food Facts, or
 * read from a label photo), Njam asks for one more photo: the front of the
 * pack. The AI reads the name off it, the product is added to the catalogue
 * (unverified) with the photos, and its Verdict screen opens with the photo,
 * like any other product. The next person who scans it finds it straight
 * away. It stays out of the feed until an admin adds it. Skipping the photo
 * shows the verdict from the ingredient list alone, and saves nothing.
 *
 * Every photo is checked before it is used: the shutter freezes the photo on
 * the panel (with a buzz), and you choose "Use this photo" or "Retake". In
 * our user test the camera kept running after the shutter, so nobody could
 * tell a photo had been taken, or that it had come out skewed.
 *
 * A label read with no barcode cannot be saved (nothing could find it
 * again), so its photo travels to the Verdict screen as a route param and
 * shows there, from the phone, for that verdict only.
 *
 * The scope pill is mandatory: it says whose rules the scan runs against.
 * The camera does not start scanning until that profile has loaded, so a
 * scan can never run against nobody, or against the wrong person.
 *
 * Only works on a physical phone (Expo Go). A simulator has no camera.
 */
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Button, EmptyState, ScanFrame, ScopePill, Snackbar } from '@/components/design-system';
import { ProductExistsError, addProduct } from '@/features/add-product/add-product';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchActiveProfile, type ActiveProfile } from '@/features/profile/active-profile';
import { fetchFromOpenFoodFacts, readOpenFoodFactsProduct } from '@/features/scanner/open-food-facts';
import { fetchProductByBarcode } from '@/features/verdict/catalogue';
import { hapticSuccess } from '@/lib/haptics';
import { LabelReadError, readFront, readLabel, type LabelRead } from '@/services/ai';
import { space } from '@/theme/tokens';

/** The barcodes printed on groceries. Leaving out QR codes stops stray reads. */
const GROCERY_BARCODES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/** Lower quality keeps the photo small enough to send; text stays legible. */
const PHOTO_QUALITY = 0.5;

const CAMERA_FAILED = 'The camera did not return a photo. Try again.';

/** Where the ingredient list came from, as the Verdict screen names it. */
type LabelSource = 'photo' | 'open-food-facts';

/** A photo just taken: the file on the phone, to show, and its base64, to send. */
type Taken = { uri: string; base64: string };

/** An ingredient list we have, waiting for the front of the pack. */
type FrontStep = {
  barcode: string;
  read: LabelRead;
  source: LabelSource;
  /** The brand Open Food Facts gave, if the front photo does not show one. */
  brand: string | null;
};

type Mode =
  | { kind: 'scanning' }
  | { kind: 'looking-up'; barcode: string }
  | { kind: 'not-found'; barcode: string }
  | { kind: 'photo'; barcode?: string }
  | { kind: 'check-label'; barcode?: string; photo: Taken }
  | { kind: 'reading'; barcode?: string; photo: Taken }
  | ({ kind: 'front' } & FrontStep)
  | ({ kind: 'check-front'; photo: Taken } & FrontStep)
  | ({ kind: 'adding'; photo: Taken } & FrontStep);

function hintFor(mode: Mode): string {
  switch (mode.kind) {
    case 'scanning':
      return 'Point the camera at a barcode. It scans by itself.';
    case 'looking-up':
      return `Looking up ${mode.barcode}`;
    case 'not-found':
      return `We do not know barcode ${mode.barcode} yet. Photograph the ingredient list instead.`;
    case 'photo':
      return 'Fit the whole ingredient list inside the frame, then tap Take the photo.';
    case 'check-label':
      return 'Is the whole list sharp and straight? Use this photo, or retake it.';
    case 'reading':
      return 'Reading the label';
    case 'front':
      return mode.source === 'open-food-facts'
        ? 'We found the ingredients. Now photograph the front of the pack, with the name inside the frame.'
        : 'Now the front of the pack. Fit the product name inside the frame, then tap Photograph the front.';
    case 'check-front':
      return 'Can you read the product name? Use this photo, or retake it.';
    case 'adding':
      return 'Adding the product to Njam';
  }
}

export function ScannerScreen() {
  const { member } = useAuth();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);

  const [profile, setProfile] = useState<ActiveProfile | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'scanning' });
  const [torchOn, setTorchOn] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // A failure on the front-photo step. Kept apart from `problem`, whose
  // Retry starts a fresh scan and would throw away the label just read.
  const [notice, setNotice] = useState<string | null>(null);

  // The label photo, kept until the front photo is taken so both can be saved.
  const labelPhoto = useRef<Taken | null>(null);

  // The camera reports the same barcode many times a second. This flag lets
  // only the first one through until the screen is ready to scan again.
  const busy = useRef(false);

  // Bumped by Retry when the profile failed to load, so this runs again.
  const [profileAttempt, setProfileAttempt] = useState(0);

  useEffect(() => {
    if (!member?.householdId) return;
    fetchActiveProfile(member.householdId)
      .then(setProfile)
      .catch(() => setProblem('We could not load your profile, so scanning is paused.'));
  }, [member?.householdId, profileAttempt]);

  // Coming back to this tab (for example from a verdict) starts a fresh scan.
  useFocusEffect(
    useCallback(() => {
      busy.current = false;
      setMode({ kind: 'scanning' });
      return () => setTorchOn(false);
    }, []),
  );

  async function onBarcode(result: BarcodeScanningResult) {
    if (busy.current) return;
    busy.current = true;
    const barcode = result.data;
    setMode({ kind: 'looking-up', barcode });

    try {
      const product = await fetchProductByBarcode(barcode);
      if (product) {
        hapticSuccess();
        router.push({ pathname: '/verdict', params: { productId: product.id, barcode } });
        return;
      }

      if (await openFromOpenFoodFacts(barcode)) return;
      setMode({ kind: 'not-found', barcode });
    } catch {
      setProblem('We could not look up that barcode. Check your connection.');
      busy.current = false;
      setMode({ kind: 'scanning' });
    }
  }

  /**
   * Tries Open Food Facts for a barcode our catalogue does not have.
   * Returns true if it found the ingredients, and moves on to the front
   * photo so the product can be added. Any failure here (offline, a slow
   * reply, no ingredient list) just returns false, so the scanner falls back
   * to asking for a label photo instead of showing an error.
   */
  async function openFromOpenFoodFacts(barcode: string): Promise<boolean> {
    try {
      const found = await fetchFromOpenFoodFacts(barcode);
      if (!found) return false;
      const read = await readOpenFoodFactsProduct(found);
      if (!read) return false;

      hapticSuccess();
      labelPhoto.current = null;
      setMode({ kind: 'front', barcode, read, source: 'open-food-facts', brand: found.brand });
      return true;
    } catch (error) {
      console.warn('Open Food Facts lookup failed', error);
      return false;
    }
  }

  /**
   * The shutter. Returns the photo, which the caller freezes on the panel,
   * with a buzz so you can feel that it was taken. null if the camera failed.
   */
  async function takePhoto(): Promise<Taken | null> {
    if (!camera.current) return null;
    try {
      const photo = await camera.current.takePictureAsync({
        base64: true,
        quality: PHOTO_QUALITY,
        shutterSound: false,
      });
      if (!photo.base64) throw new Error('No base64');
      hapticSuccess();
      return { uri: photo.uri, base64: photo.base64 };
    } catch (error) {
      console.warn('The camera did not return a photo', error);
      return null;
    }
  }

  async function photographLabel() {
    if (mode.kind !== 'photo') return;
    const barcode = mode.barcode;
    const photo = await takePhoto();
    if (photo) setMode({ kind: 'check-label', barcode, photo });
    else setProblem(CAMERA_FAILED);
  }

  /** "Use this photo" on the label: read it, then ask for the front or show the verdict. */
  async function readLabelPhoto(photo: Taken, barcode?: string) {
    setMode({ kind: 'reading', barcode, photo });

    try {
      const read = await readLabel({ imageBase64: photo.base64, mimeType: 'image/jpeg' });

      // A barcode we did not know, and a label we could read: ask for the
      // front of the pack so the product can be added. A product needs a
      // barcode to be found again, so a label with none goes straight on,
      // with its photo to show on the verdict.
      if (barcode && read.readable) {
        labelPhoto.current = photo;
        setMode({ kind: 'front', barcode, read, source: 'photo', brand: null });
        return;
      }
      openLabelVerdict(read, { barcode, photoUri: photo.uri });
    } catch (error) {
      setProblem(error instanceof LabelReadError ? error.message : 'We could not read the label. Try again.');
      setMode({ kind: 'photo', barcode });
    }
  }

  /**
   * The verdict from the ingredient list alone. Nothing is added to the
   * catalogue. The photo just taken, if any, goes along to show on it.
   */
  function openLabelVerdict(
    read: LabelRead,
    from: { barcode?: string; source?: LabelSource; brand?: string | null; photoUri?: string | null },
  ) {
    // The label read travels to the Verdict screen as a route param.
    router.push({
      pathname: '/verdict',
      params: {
        label: JSON.stringify(read),
        ...(from.barcode ? { barcode: from.barcode } : {}),
        ...(from.source === 'open-food-facts' ? { source: from.source } : {}),
        ...(from.brand ? { brand: from.brand } : {}),
        ...(from.photoUri ? { photo: from.photoUri } : {}),
      },
    });
  }

  /** The shutter on the front of the pack: freeze it, then check it. */
  async function photographFront() {
    if (mode.kind !== 'front') return;
    const step: FrontStep = { barcode: mode.barcode, read: mode.read, source: mode.source, brand: mode.brand };
    setNotice(null);
    const photo = await takePhoto();
    if (photo) setMode({ kind: 'check-front', ...step, photo });
    // A notice, not a problem: the problem's Retry would throw away the label read.
    else setNotice(CAMERA_FAILED);
  }

  /**
   * "Use this photo" on the front of the pack: read its name, then add the
   * product with its photos and open its verdict, which shows the front
   * photo. Any failure goes back to the live camera on this step, with the
   * ingredient list kept, so you can try again or skip.
   */
  async function addWithFront(step: FrontStep, photo: Taken) {
    if (!member) return;
    // A label read needs its photo saved with it; Open Food Facts has none.
    if (step.source === 'photo' && !labelPhoto.current) return;
    const { barcode, read } = step;
    setNotice(null);
    setMode({ kind: 'adding', ...step, photo });

    try {
      const front = await readFront({ imageBase64: photo.base64, mimeType: 'image/jpeg' });
      if (!front.readable || !front.name) {
        setNotice(`${front.problem ?? 'We could not read the product name.'} Fit the name inside the frame and try again.`);
        setMode({ kind: 'front', ...step });
        return;
      }

      const productId = await addProduct({
        userId: member.id,
        barcode,
        front: { ...front, name: front.name, brand: front.brand ?? step.brand },
        label: read,
        source: step.source === 'photo' ? 'ai_label_read' : 'open_food_facts',
        frontPhotoBase64: photo.base64,
        labelPhotoBase64: labelPhoto.current?.base64 ?? null,
      });
      labelPhoto.current = null;
      hapticSuccess();
      router.push({ pathname: '/verdict', params: { productId, barcode } });
    } catch (error) {
      // Someone added this barcode first: open theirs.
      if (error instanceof ProductExistsError) {
        const existing = await fetchProductByBarcode(barcode).catch(() => null);
        if (existing) {
          router.push({ pathname: '/verdict', params: { productId: existing.id, barcode } });
          return;
        }
      }
      console.warn('Could not add the product', error);
      setNotice(
        error instanceof LabelReadError
          ? error.message
          : 'We could not add this product. Try again, or show the verdict without it.',
      );
      setMode({ kind: 'front', ...step });
    }
  }

  if (!permission) {
    // Still asking the phone what it allows.
    return <Screen withTabBar>{null}</Screen>;
  }

  if (!permission.granted) {
    return (
      <Screen withTabBar>
        <EmptyState
          variant="screen"
          icon="photo_camera"
          headline="Njam needs your camera to read barcodes"
          body={
            permission.canAskAgain
              ? 'The camera is only used while this screen is open. Nothing is recorded.'
              : 'You turned the camera off for Njam. Turn it on in your phone settings.'
          }
          actionLabel={permission.canAskAgain ? 'Allow the camera' : 'Open settings'}
          onAction={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
        />
      </Screen>
    );
  }

  const canScan = mode.kind === 'scanning' && profile !== null;
  // The photo frozen on the panel while you check it, and while it is read.
  const frozen = 'photo' in mode ? mode.photo : null;

  return (
    <Screen scroll={false} withTabBar>
      <ScanFrame
        torchOn={torchOn}
        onToggleTorch={() => setTorchOn((on) => !on)}
        hint={profile ? hintFor(mode) : 'Loading your profile'}
        scope={
          profile && (
            <ScopePill
              people={[profile.name]}
              label={`Checking for ${profile.name}`}
              // Choosing another profile arrives with the Household screen.
              onPress={() => router.navigate('/profile')}
            />
          )
        }
        bottomAction={
          mode.kind === 'photo' ? (
            <Button label="Take the photo" icon="photo_camera" size="large" onPress={photographLabel} />
          ) : mode.kind === 'check-label' ? (
            <View style={styles.choice}>
              <Button label="Retake" variant="outlined" onPress={() => setMode({ kind: 'photo', barcode: mode.barcode })} />
              <Button label="Use this photo" icon="check" onPress={() => readLabelPhoto(mode.photo, mode.barcode)} />
            </View>
          ) : mode.kind === 'front' ? (
            <View style={styles.actions}>
              <Button label="Photograph the front" icon="photo_camera" size="large" onPress={photographFront} />
              <Button
                label="Show the verdict without it"
                variant="outlined"
                size="small"
                onPress={() => {
                  setNotice(null);
                  openLabelVerdict(mode.read, {
                    barcode: mode.barcode,
                    source: mode.source,
                    brand: mode.brand,
                    photoUri: labelPhoto.current?.uri,
                  });
                }}
              />
            </View>
          ) : mode.kind === 'check-front' ? (
            <View style={styles.choice}>
              <Button
                label="Retake"
                variant="outlined"
                onPress={() =>
                  setMode({ kind: 'front', barcode: mode.barcode, read: mode.read, source: mode.source, brand: mode.brand })
                }
              />
              <Button
                label="Use this photo"
                icon="check"
                onPress={() =>
                  addWithFront({ barcode: mode.barcode, read: mode.read, source: mode.source, brand: mode.brand }, mode.photo)
                }
              />
            </View>
          ) : mode.kind === 'adding' ? (
            <Button label="Use this photo" loading loadingLabel="Adding the product" onPress={() => {}} />
          ) : mode.kind === 'reading' ? (
            <Button label="Use this photo" loading loadingLabel="Reading the label" onPress={() => {}} />
          ) : mode.kind === 'not-found' ? (
            <Button
              label="Photograph the label"
              icon="add_a_photo"
              onPress={() => setMode({ kind: 'photo', barcode: mode.barcode })}
            />
          ) : (
            <Button
              label="No barcode? Photograph the label"
              icon="add_a_photo"
              variant="outlined"
              size="small"
              onPress={() => setMode({ kind: 'photo' })}
            />
          )
        }>
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
          // Only run the camera while this tab is on screen.
          active={focused}
          enableTorch={torchOn}
          barcodeScannerSettings={{ barcodeTypes: [...GROCERY_BARCODES] }}
          onBarcodeScanned={canScan ? onBarcode : undefined}
        />
        {frozen && (
          <Image source={{ uri: frozen.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
        )}
      </ScanFrame>

      {problem && (
        <Snackbar
          kind="failure"
          message={problem}
          actionLabel="Retry"
          onAction={() => {
            setProblem(null);
            if (!profile) setProfileAttempt((count) => count + 1);
            busy.current = false;
            setMode({ kind: 'scanning' });
          }}
          onDismiss={() => setProblem(null)}
        />
      )}

      {notice && <Snackbar kind="failure" message={notice} onDismiss={() => setNotice(null)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // "Photograph the front" with the way to skip it underneath.
  actions: {
    alignItems: 'center',
    gap: space.s1,
  },
  // "Retake" and "Use this photo", side by side.
  choice: {
    flexDirection: 'row',
    gap: space.s3,
  },
});
