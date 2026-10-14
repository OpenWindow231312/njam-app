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
 * After a label photo of a barcode we did not know, Njam asks for one more
 * photo: the front of the pack. The AI reads the name off it, and the
 * product is added to the catalogue (unverified) with both photos, so the
 * next person who scans it finds it straight away. Skipping that photo
 * shows the verdict from the label alone, as before.
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
import { Linking, StyleSheet, View } from 'react-native';

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

type Mode =
  | { kind: 'scanning' }
  | { kind: 'looking-up'; barcode: string }
  | { kind: 'not-found'; barcode: string }
  | { kind: 'photo'; barcode?: string }
  | { kind: 'reading'; barcode?: string }
  | { kind: 'front'; barcode: string; read: LabelRead }
  | { kind: 'adding'; barcode: string; read: LabelRead };

function hintFor(mode: Mode): string {
  switch (mode.kind) {
    case 'scanning':
      return 'Point the camera at the barcode';
    case 'looking-up':
      return `Looking up ${mode.barcode}`;
    case 'not-found':
      return `We do not know barcode ${mode.barcode} yet. Photograph the ingredient list instead.`;
    case 'photo':
      return 'Fit the whole ingredient list inside the frame';
    case 'reading':
      return 'Reading the label';
    case 'front':
      return 'Now the front of the pack. Fit the product name inside the frame.';
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
  const labelPhoto = useRef<string | null>(null);

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
   * Returns true if it opened a verdict. Any failure here (offline, a slow
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
      router.push({
        pathname: '/verdict',
        params: {
          label: JSON.stringify(read),
          barcode,
          source: 'open-food-facts',
          ...(found.brand ? { brand: found.brand } : {}),
        },
      });
      return true;
    } catch (error) {
      console.warn('Open Food Facts lookup failed', error);
      return false;
    }
  }

  async function photographLabel() {
    if (!camera.current || mode.kind !== 'photo') return;
    const barcode = mode.barcode;
    setMode({ kind: 'reading', barcode });

    try {
      const photo = await camera.current.takePictureAsync({
        base64: true,
        quality: PHOTO_QUALITY,
        shutterSound: false,
      });
      if (!photo.base64) throw new LabelReadError('The camera did not return a photo. Try again.');

      const read = await readLabel({ imageBase64: photo.base64, mimeType: 'image/jpeg' });

      // A barcode we did not know, and a label we could read: ask for the
      // front of the pack so the product can be added. A product needs a
      // barcode to be found again, so a label with none goes straight on.
      if (barcode && read.readable) {
        labelPhoto.current = photo.base64;
        setMode({ kind: 'front', barcode, read });
        return;
      }
      openLabelVerdict(read, barcode);
    } catch (error) {
      setProblem(error instanceof LabelReadError ? error.message : 'We could not read the label. Try again.');
      setMode({ kind: 'photo', barcode });
    }
  }

  /** The verdict from the label read alone. Nothing is added to the catalogue. */
  function openLabelVerdict(read: LabelRead, barcode?: string) {
    // The label read travels to the Verdict screen as a route param.
    router.push({
      pathname: '/verdict',
      params: barcode ? { label: JSON.stringify(read), barcode } : { label: JSON.stringify(read) },
    });
  }

  /**
   * The front of the pack: read its name, then add the product with both
   * photos and open its verdict. Any failure keeps you on this step, with
   * the label read kept, so you can try again or skip.
   */
  async function photographFront() {
    if (!camera.current || mode.kind !== 'front' || !member || !labelPhoto.current) return;
    const { barcode, read } = mode;
    setNotice(null);
    setMode({ kind: 'adding', barcode, read });

    try {
      const photo = await camera.current.takePictureAsync({
        base64: true,
        quality: PHOTO_QUALITY,
        shutterSound: false,
      });
      if (!photo.base64) throw new LabelReadError('The camera did not return a photo. Try again.');

      const front = await readFront({ imageBase64: photo.base64, mimeType: 'image/jpeg' });
      if (!front.readable || !front.name) {
        setNotice(`${front.problem ?? 'We could not read the product name.'} Fit the name inside the frame and try again.`);
        setMode({ kind: 'front', barcode, read });
        return;
      }

      const productId = await addProduct({
        userId: member.id,
        barcode,
        front: { ...front, name: front.name },
        label: read,
        frontPhotoBase64: photo.base64,
        labelPhotoBase64: labelPhoto.current,
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
      setMode({ kind: 'front', barcode, read });
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
            <Button label="Take the photo" icon="photo_camera" onPress={photographLabel} />
          ) : mode.kind === 'front' ? (
            <View style={styles.actions}>
              <Button label="Photograph the front" icon="photo_camera" onPress={photographFront} />
              <Button
                label="Show the verdict without it"
                variant="outlined"
                size="small"
                onPress={() => {
                  setNotice(null);
                  openLabelVerdict(mode.read, mode.barcode);
                }}
              />
            </View>
          ) : mode.kind === 'adding' ? (
            <Button label="Photograph the front" loading loadingLabel="Adding the product" onPress={() => {}} />
          ) : mode.kind === 'reading' ? (
            <Button label="Take the photo" loading loadingLabel="Reading the label" onPress={() => {}} />
          ) : mode.kind === 'not-found' ? (
            <Button
              label="Photograph the label"
              icon="add_a_photo"
              onPress={() => setMode({ kind: 'photo', barcode: mode.barcode })}
            />
          ) : (
            <Button
              label="Photograph the label"
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
});
