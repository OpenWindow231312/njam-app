/**
 * Scanner: photograph a barcode and get a verdict.
 *
 * Nothing is read until the round shutter button is pressed (v1.13). In our
 * user test the camera scanned by itself, and people held it on the product
 * without knowing whether anything had happened. Now:
 *
 *   1. Scan a barcode. The shutter takes a photo, which freezes on the panel
 *      with a buzz. A lime line sweeps the brackets while the barcode is read
 *      from the photo, then its number floats up above them, digit by digit,
 *      while we look it up. In our catalogue: the Verdict screen opens.
 *
 *   2. If the barcode will not read. There is no timer: reading a photo takes
 *      under a second, so a miss shows straight away as a message card ("We
 *      could not read that barcode") with what to try. A second miss in a row
 *      opens a drawer to type the number instead, then "Find this product".
 *
 *   3. Not in Njam yet. We try Open Food Facts, a public database, for its
 *      ingredients. Either way Njam asks for a photo of the front of the pack
 *      (its name, and the photo on the product page). If Open Food Facts had
 *      no ingredients, it then asks for a photo of the ingredient list, which
 *      the AI reads. The product is added to the catalogue (unverified, so
 *      capped at Caution) and its Verdict screen opens. The next person who
 *      scans it finds it straight away.
 *
 * Every photo is checked before it is used: it freezes on the panel, whole
 * and not zoomed, with a message card asking the one question that matters,
 * and "Retake" or "Use this photo" where the shutter was.
 *
 * The scanner fills the screen: the TabBar hides on this tab, and the close
 * button goes back to Home.
 *
 * Only works on a physical phone (Expo Go). A simulator has no camera.
 */
import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import {
  BottomSheet,
  Button,
  CameraMessage,
  EmptyState,
  ScanFrame,
  ShutterButton,
  Snackbar,
  TextField,
} from '@/components/design-system';
import { ProductExistsError, addProduct } from '@/features/add-product/add-product';
import { useAuth } from '@/features/auth/AuthProvider';
import { BarcodeReadout } from '@/features/scanner/BarcodeReadout';
import { fetchFromOpenFoodFacts, readOpenFoodFactsProduct } from '@/features/scanner/open-food-facts';
import { fetchProductByBarcode } from '@/features/verdict/catalogue';
import { currentDeviceSettings } from '@/lib/device-settings';
import { hapticSuccess } from '@/lib/haptics';
import { LabelReadError, readFront, readLabel, type LabelRead } from '@/services/ai';
import { space } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/** The barcodes printed on groceries. Leaving out QR codes stops stray reads. */
const GROCERY_BARCODES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/** Lower quality keeps the photo small enough to send; text stays legible. */
const PHOTO_QUALITY = 0.5;

/** Misses in a row before the drawer to type the number opens by itself. */
const MISSES_BEFORE_TYPING = 2;

/** Grocery barcodes are 8 (EAN-8), 12 (UPC-A) or 13 (EAN-13) digits. */
const BARCODE_PATTERN = /^\d{8,13}$/;

const CAMERA_FAILED = 'The camera did not return a photo. Try again.';

/** Where the ingredient list came from, as the catalogue records it. */
type LabelSource = 'photo' | 'open-food-facts';

/** A photo just taken: the file on the phone, to show, and its base64, to send. */
type Taken = { uri: string; base64: string };

/** A barcode Njam does not know yet, on its way to being added. */
type NewProduct = {
  barcode: string;
  source: LabelSource;
  /** The ingredient list, once we have it. null until the label photo is read. */
  read: LabelRead | null;
  /** The brand Open Food Facts gave, if the front photo does not show one. */
  brand: string | null;
};

type Mode =
  | { kind: 'aim'; missed: boolean }
  | { kind: 'reading-barcode'; photo: Taken }
  | { kind: 'looking-up'; barcode: string; photo: Taken | null }
  | ({ kind: 'front' } & NewProduct)
  | ({ kind: 'check-front'; front: Taken } & NewProduct)
  | ({ kind: 'label'; front: Taken; problem: string | null } & NewProduct)
  | ({ kind: 'reading-label'; front: Taken; label: Taken } & NewProduct)
  | ({ kind: 'check-label'; front: Taken; label: Taken; read: LabelRead } & Omit<NewProduct, 'read'>)
  | ({ kind: 'adding'; front: Taken } & NewProduct);

/** The line in the hint pill under the brackets. */
function hintFor(mode: Mode): string | undefined {
  switch (mode.kind) {
    case 'aim':
      return 'Fit the barcode inside the frame';
    case 'reading-barcode':
      return 'Reading the barcode';
    case 'looking-up':
      return 'Looking for this barcode in Njam';
    case 'front':
      return 'Take a photo of the front packaging';
    case 'label':
      return 'Fit the whole ingredient list inside the frame';
    case 'reading-label':
      return 'Reading the ingredients';
    case 'adding':
      return 'Adding the product to Njam';
    case 'check-front':
    case 'check-label':
      // The message card asks the question; the hint would repeat it.
      return undefined;
  }
}

/** The message card under the top row, when there is something to say in words. */
function messageFor(mode: Mode) {
  switch (mode.kind) {
    case 'aim':
      return mode.missed ? (
        <CameraMessage
          icon="info"
          title="We could not read that barcode"
          body="Hold your phone still, a little closer, with the barcode flat and out of glare. Then press the round button again."
        />
      ) : null;
    case 'front':
      return (
        <CameraMessage
          icon="barcode"
          title="This product is not in Njam yet"
          body="Help us add it by taking a photo of the packaging"
        />
      );
    case 'check-front':
      return (
        <CameraMessage
          icon="photo_camera"
          title="Does this photo show the product clearly?"
          body="This is how it will look on the product page."
        />
      );
    case 'label':
      return mode.problem ? (
        <CameraMessage icon="info" title="We could not read the ingredient list" body={mode.problem} />
      ) : null;
    case 'check-label':
      return (
        <CameraMessage
          icon="photo_camera"
          title="Is that the whole list?"
          body="Read from your photo, not yet verified."
        />
      );
    default:
      return null;
  }
}

/** The photo frozen on the panel, if the mode has one, and whether it is being checked. */
function frozenPhoto(mode: Mode): { photo: Taken; checking: boolean } | null {
  switch (mode.kind) {
    case 'reading-barcode':
      return { photo: mode.photo, checking: false };
    case 'looking-up':
      return mode.photo ? { photo: mode.photo, checking: false } : null;
    case 'check-front':
    case 'adding':
      return { photo: mode.front, checking: true };
    case 'reading-label':
      return { photo: mode.label, checking: false };
    case 'check-label':
      return { photo: mode.label, checking: true };
    default:
      return null;
  }
}

/** Just the new-product fields from a mode, to carry them to the next step. */
function newProductOf(mode: NewProduct): NewProduct {
  return { barcode: mode.barcode, source: mode.source, read: mode.read, brand: mode.brand };
}

export function ScannerScreen() {
  const { member } = useAuth();
  const { colors } = useNjamTheme();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);

  const [mode, setMode] = useState<Mode>({ kind: 'aim', missed: false });
  const [torchOn, setTorchOn] = useState(false);
  // A lookup that failed (offline). Its Retry starts a fresh scan.
  const [problem, setProblem] = useState<string | null>(null);
  // A failure while adding a product. Kept apart from `problem`, whose Retry
  // would throw away the photos already taken.
  const [notice, setNotice] = useState<string | null>(null);

  // Barcode photos in a row that had no barcode we could read.
  const misses = useRef(0);
  // The drawer to type the number, and what has been typed.
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState<string | undefined>();

  // The label photo, kept until the product is added so it can be saved.
  // In a ref rather than the mode: if adding fails, the front is retaken but
  // the ingredient list already read is kept.
  const labelPhoto = useRef<Taken | null>(null);

  // Each time the scanner opens, the flashlight starts as set on Profile >
  // Settings. You can still switch it on the camera panel.
  useEffect(() => {
    if (focused) setTorchOn(currentDeviceSettings().flashlight === 'on');
  }, [focused]);

  // Coming back to this tab (for example from a verdict) starts a fresh scan.
  useFocusEffect(
    useCallback(() => {
      misses.current = 0;
      labelPhoto.current = null;
      setMode({ kind: 'aim', missed: false });
      return () => setTorchOn(false);
    }, []),
  );

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

  /** The shutter on a barcode: photograph it, then read the barcode from the photo. */
  async function photographBarcode() {
    if (mode.kind !== 'aim') return;
    const photo = await takePhoto();
    if (!photo) {
      setProblem(CAMERA_FAILED);
      return;
    }
    setMode({ kind: 'reading-barcode', photo });

    let barcode: string | undefined;
    try {
      const found = await scanFromURLAsync(photo.uri, [...GROCERY_BARCODES]);
      barcode = found[0]?.data;
    } catch (error) {
      console.warn('Could not read a barcode from the photo', error);
    }

    if (barcode) {
      misses.current = 0;
      lookUp(barcode, photo);
      return;
    }

    // A miss: say what to try. The second miss in a row opens the drawer.
    misses.current += 1;
    setMode({ kind: 'aim', missed: true });
    if (misses.current >= MISSES_BEFORE_TYPING) openTyping();
  }

  function openTyping() {
    setTyped('');
    setTypedError(undefined);
    setTyping(true);
  }

  /** "Find this product" in the drawer. */
  function findTyped() {
    const barcode = typed.replace(/\s/g, '');
    if (!BARCODE_PATTERN.test(barcode)) {
      setTypedError('Type the 8 to 13 numbers printed under the bars');
      return;
    }
    setTyping(false);
    misses.current = 0;
    lookUp(barcode, null);
  }

  /**
   * Looks a barcode up: our catalogue first, then Open Food Facts. Found in
   * ours, the Verdict screen opens. Otherwise Njam asks for the front of the
   * pack to add it.
   */
  async function lookUp(barcode: string, photo: Taken | null) {
    setMode({ kind: 'looking-up', barcode, photo });

    try {
      const product = await fetchProductByBarcode(barcode);
      if (product) {
        hapticSuccess();
        router.push({ pathname: '/verdict', params: { productId: product.id, barcode } });
        return;
      }

      labelPhoto.current = null;
      const fromOpenFoodFacts = await tryOpenFoodFacts(barcode);
      setMode({ kind: 'front', ...(fromOpenFoodFacts ?? { barcode, source: 'photo', read: null, brand: null }) });
    } catch {
      setProblem('We could not look up that barcode. Check your connection.');
      setMode({ kind: 'aim', missed: false });
    }
  }

  /**
   * Tries Open Food Facts for a barcode our catalogue does not have. Returns
   * the ingredient list if it has one, so only the front photo is needed.
   * Any failure here (offline, a slow reply, no ingredient list) just returns
   * null, so the scanner asks for a label photo instead of showing an error.
   */
  async function tryOpenFoodFacts(barcode: string): Promise<NewProduct | null> {
    try {
      const found = await fetchFromOpenFoodFacts(barcode);
      if (!found) return null;
      const read = await readOpenFoodFactsProduct(found);
      if (!read) return null;
      return { barcode, source: 'open-food-facts', read, brand: found.brand };
    } catch (error) {
      console.warn('Open Food Facts lookup failed', error);
      return null;
    }
  }

  /** The shutter on the front of the pack: freeze it, then check it. */
  async function photographFront() {
    if (mode.kind !== 'front') return;
    const step = newProductOf(mode);
    setNotice(null);
    const front = await takePhoto();
    if (front) setMode({ kind: 'check-front', ...step, front });
    // A notice, not a problem: the problem's Retry would start a fresh scan.
    else setNotice(CAMERA_FAILED);
  }

  /** "Use this photo" on the front: add the product if we have its ingredients, otherwise ask for them. */
  function acceptFront(step: NewProduct, front: Taken) {
    if (step.read) addWithFront(step, front);
    else setMode({ kind: 'label', ...step, front, problem: null });
  }

  /** The shutter on the ingredient list: freeze it and read it straight away. */
  async function photographLabel() {
    if (mode.kind !== 'label') return;
    const step = newProductOf(mode);
    const front = mode.front;
    const label = await takePhoto();
    if (!label) {
      setNotice(CAMERA_FAILED);
      return;
    }
    setMode({ kind: 'reading-label', ...step, front, label });

    try {
      const read = await readLabel({ imageBase64: label.base64, mimeType: 'image/jpeg' });
      if (!read.readable) {
        setMode({ kind: 'label', ...step, front, problem: read.problem ?? 'Fit the whole list inside the frame and try again.' });
        return;
      }
      setMode({ kind: 'check-label', ...step, front, label, read });
    } catch (error) {
      const problemText = error instanceof LabelReadError ? error.message : 'Check your connection and try again.';
      setMode({ kind: 'label', ...step, front, problem: problemText });
    }
  }

  /**
   * Reads the name off the front photo, then adds the product with its
   * photos and opens its verdict. Any failure goes back to the front photo,
   * with the ingredient list kept, so you can try again.
   */
  async function addWithFront(step: NewProduct, front: Taken) {
    if (!member || !step.read) return;
    // A label read needs its photo saved with it; Open Food Facts has none.
    if (step.source === 'photo' && !labelPhoto.current) return;
    const { barcode, read } = step;
    setNotice(null);
    setMode({ kind: 'adding', ...step, front });

    try {
      const name = await readFront({ imageBase64: front.base64, mimeType: 'image/jpeg' });
      if (!name.readable || !name.name) {
        setNotice(`${name.problem ?? 'We could not read the product name.'} Fit the name inside the frame and try again.`);
        setMode({ kind: 'front', ...step });
        return;
      }

      const productId = await addProduct({
        userId: member.id,
        barcode,
        front: { ...name, name: name.name, brand: name.brand ?? step.brand },
        label: read,
        source: step.source === 'photo' ? 'ai_label_read' : 'open_food_facts',
        frontPhotoBase64: front.base64,
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
      setNotice(error instanceof LabelReadError ? error.message : 'We could not add this product. Try again.');
      setMode({ kind: 'front', ...step });
    }
  }

  if (!permission) {
    // Still asking the phone what it allows.
    return <Screen>{null}</Screen>;
  }

  if (!permission.granted) {
    return (
      <Screen>
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

  const frozen = frozenPhoto(mode);
  const target =
    mode.kind === 'label' || mode.kind === 'reading-label'
      ? 'label'
      : mode.kind === 'aim' || mode.kind === 'reading-barcode' || mode.kind === 'front'
        ? 'barcode'
        : mode.kind === 'looking-up' && mode.photo
          ? 'barcode'
          : 'none';

  return (
    <Screen scroll={false}>
      <ScanFrame
        onClose={() => router.navigate('/')}
        torchOn={torchOn}
        onToggleTorch={() => setTorchOn((on) => !on)}
        message={messageFor(mode)}
        hint={hintFor(mode)}
        target={target}
        scanning={mode.kind === 'reading-barcode' || mode.kind === 'reading-label'}
        readout={mode.kind === 'looking-up' ? <BarcodeReadout key={mode.barcode} barcode={mode.barcode} /> : undefined}
        overlay={
          frozen ? (
            // A photo being read fills the panel, as the camera saw it. A photo
            // being checked shows whole, not zoomed in, so nothing is hidden.
            <Image
              source={{ uri: frozen.photo.uri }}
              style={StyleSheet.absoluteFill}
              resizeMode={frozen.checking ? 'contain' : 'cover'}
              accessibilityIgnoresInvertColors
            />
          ) : mode.kind === 'looking-up' ? (
            // A typed number has no photo: dim the live camera behind the readout.
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceScrim }]} />
          ) : undefined
        }
        bottomAction={
          mode.kind === 'check-front' ? (
            <View style={styles.choice}>
              <View style={styles.choiceButton}>
                <Button label="Retake" variant="outlined" fullWidth onPress={() => setMode({ kind: 'front', ...newProductOf(mode) })} />
              </View>
              <View style={styles.choiceButton}>
                <Button label="Use this photo" icon="check" fullWidth onPress={() => acceptFront(newProductOf(mode), mode.front)} />
              </View>
            </View>
          ) : mode.kind === 'check-label' ? (
            <View style={styles.choice}>
              <View style={styles.choiceButton}>
                <Button
                  label="Retake"
                  variant="outlined"
                  fullWidth
                  onPress={() =>
                    setMode({ kind: 'label', barcode: mode.barcode, source: mode.source, read: null, brand: mode.brand, front: mode.front, problem: null })
                  }
                />
              </View>
              <View style={styles.choiceButton}>
                <Button
                  label="Use this photo"
                  icon="check"
                  fullWidth
                  onPress={() => {
                    labelPhoto.current = mode.label;
                    addWithFront({ barcode: mode.barcode, source: mode.source, read: mode.read, brand: mode.brand }, mode.front);
                  }}
                />
              </View>
            </View>
          ) : mode.kind === 'aim' ? (
            <ShutterButton accessibilityLabel="Take a photo of the barcode" onPress={photographBarcode} />
          ) : mode.kind === 'front' ? (
            <ShutterButton accessibilityLabel="Take a photo of the front of the pack" onPress={photographFront} />
          ) : mode.kind === 'label' ? (
            <ShutterButton accessibilityLabel="Take a photo of the ingredient list" onPress={photographLabel} />
          ) : (
            // Reading, looking up or adding: the shutter stays, greyed out.
            <ShutterButton accessibilityLabel="Reading your photo" busy onPress={() => {}} />
          )
        }>
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
          // Only run the camera while this tab is on screen.
          active={focused}
          enableTorch={torchOn}
        />
      </ScanFrame>

      <BottomSheet
        visible={typing}
        title="We could not read the barcode"
        subtitle="Type the numbers under the bars instead. There are usually 13."
        onClose={() => setTyping(false)}
        footer={<Button label="Find this product" size="large" fullWidth onPress={findTyped} />}>
        <TextField
          label="Barcode number"
          value={typed}
          onChangeText={(text) => {
            setTyped(text);
            setTypedError(undefined);
          }}
          keyboardType="number-pad"
          placeholder="6001234000017"
          helper="Usually 13 digits, no spaces"
          error={typedError}
        />
      </BottomSheet>

      {problem && (
        <Snackbar
          kind="failure"
          message={problem}
          actionLabel="Retry"
          onAction={() => {
            setProblem(null);
            setMode({ kind: 'aim', missed: false });
          }}
          onDismiss={() => setProblem(null)}
        />
      )}

      {notice && <Snackbar kind="failure" message={notice} onDismiss={() => setNotice(null)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // "Retake" and "Use this photo", side by side, sharing the width equally.
  choice: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: space.s3,
  },
  choiceButton: {
    flex: 1,
  },
});
