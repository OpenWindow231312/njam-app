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
 *      while we look it up. Found: the product's name shows under the
 *      brackets for a moment (motion.resultHold), then its Verdict opens.
 *
 *   2. If the barcode will not read. There is no timer: reading a photo takes
 *      under a second, so a miss shows straight away as a message card ("We
 *      could not read that barcode") with what to try. A second miss in a row
 *      opens a drawer to type the number instead. "Find this product" turns
 *      into a loading button while it looks; the drawer closes once it knows.
 *
 *   3. Looking it up. Our catalogue first. If it is not there, the
 *      import-open-food-facts function tries Open Food Facts, a public
 *      database; when that has the ingredient list, the product is saved to
 *      the catalogue straight away (no AI, no extra photo) and opens like any
 *      other. See open-food-facts.ts.
 *
 *   4. Not in Njam yet. Njam asks for two photos to add it: the front of the
 *      pack (checked, with "Retake" or "Use this photo"), then the ingredient
 *      list. The list is not checked: the AI reads it straight away while the
 *      line sweeps it, and the card says how many ingredients it read. The
 *      product is added to the catalogue (unverified) and its Verdict opens.
 *      The next person who scans it finds it straight away.
 *
 * The product name is read from the front photo while you photograph the
 * ingredient list, so the second photo does not wait on the first.
 *
 * No barcode at all? The typing drawer offers "Photograph the ingredient
 * list" instead. That verdict comes from the label alone; nothing is saved,
 * since nothing could find it again, so the photo travels to the Verdict
 * screen as a route param.
 *
 * Every message is the one CameraMessage card, always just under the close
 * and torch buttons. The scanner fills the screen: the TabBar hides on this
 * tab, and the close button goes back to Home. Whose rules a verdict uses is
 * picked on the Verdict screen ("For ...").
 *
 * Only works on a physical phone (Expo Go). A simulator has no camera.
 */
import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import {
  BottomSheet,
  Button,
  CameraMessage,
  EmptyState,
  IconButton,
  ScanFrame,
  ShutterButton,
  Snackbar,
  TextField,
} from '@/components/design-system';
import { ProductExistsError, addProduct } from '@/features/add-product/add-product';
import { useAuth } from '@/features/auth/AuthProvider';
import { BarcodeReadout } from '@/features/scanner/BarcodeReadout';
import { FoundProduct } from '@/features/scanner/FoundProduct';
import { parseTypedBarcode } from '@/features/scanner/barcode';
import { importFromOpenFoodFacts } from '@/features/scanner/open-food-facts';
import { fetchProductByBarcode, fetchProductById, productDetail } from '@/features/verdict/catalogue';
import { currentDeviceSettings } from '@/lib/device-settings';
import { hapticSuccess } from '@/lib/haptics';
import { LabelReadError, readFront, readLabel, type FrontRead, type LabelRead } from '@/services/ai';
import { motion, space } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/** The barcodes printed on groceries. Leaving out QR codes stops stray reads. */
const GROCERY_BARCODES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/** Lower quality keeps the photo small enough to send; text stays legible. */
const PHOTO_QUALITY = 0.5;

/** Misses in a row before the drawer to type the number opens by itself. */
const MISSES_BEFORE_TYPING = 2;

const CAMERA_FAILED = 'The camera did not return a photo. Try again.';
const LOOKUP_FAILED = 'We could not look up that barcode. Check your connection and try again.';

/** A photo just taken: the file on the phone, to show, and its base64, to send. */
type Taken = { uri: string; base64: string };

/** A product the barcode found, ready to open. */
type Found = {
  productId: string;
  /** null when the product was saved but we could not fetch its name back. */
  name: string | null;
  detail: string;
};

type Mode =
  | { kind: 'aim'; missed: boolean }
  | { kind: 'reading-barcode'; photo: Taken }
  | { kind: 'looking-up'; barcode: string; photo: Taken | null }
  | { kind: 'found'; barcode: string; photo: Taken | null; name: string; detail: string }
  // Not in Njam: the front of the pack. `read` is the ingredient list, once
  // we have it (the front is retaken if its name would not read).
  | { kind: 'front'; barcode: string; read: LabelRead | null; problem: string | null }
  | { kind: 'check-front'; barcode: string; read: LabelRead | null; front: Taken }
  // The ingredient list. No barcode means a label-only verdict, not saved.
  | { kind: 'label'; barcode: string | null; problem: string | null }
  | { kind: 'reading-label'; barcode: string | null; label: Taken }
  | { kind: 'adding'; barcode: string; read: LabelRead; photo: Taken };

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
    case 'found':
    case 'check-front':
      // The product card or the message card says it; the hint would repeat it.
      return undefined;
  }
}

/** "14 ingredients", "1 ingredient". */
function ingredientCount(read: LabelRead): string {
  const count = read.ingredients.length;
  return `${count} ${count === 1 ? 'ingredient' : 'ingredients'}`;
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
      return mode.problem ? (
        <CameraMessage icon="info" title="We could not read the product name" body={mode.problem} />
      ) : (
        <CameraMessage
          icon="barcode"
          title="This product is not in Njam yet"
          body="Help us add it by taking a photo of the front packaging."
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
      if (mode.problem) {
        return <CameraMessage icon="info" title="We could not read the ingredient list" body={mode.problem} />;
      }
      return mode.barcode ? (
        <CameraMessage
          icon="photo_camera"
          title="Now photograph the ingredient list"
          body="Njam reads it and checks it against your rules."
        />
      ) : (
        <CameraMessage
          icon="photo_camera"
          title="Photograph the ingredient list"
          body="Without a barcode Njam cannot save the product, but you still get a verdict."
        />
      );
    case 'adding':
      return (
        <CameraMessage
          icon="check"
          title="Ingredients read"
          body={`We read ${ingredientCount(mode.read)} from your photo. Not yet checked by our team.`}
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
    case 'adding':
      return { photo: mode.photo, checking: false };
    case 'looking-up':
    case 'found':
      return mode.photo ? { photo: mode.photo, checking: false } : null;
    case 'check-front':
      return { photo: mode.front, checking: true };
    case 'reading-label':
      return { photo: mode.label, checking: false };
    default:
      return null;
  }
}

/** Which brackets to draw: wide for a barcode or the front, tall for an ingredient list. */
function targetFor(mode: Mode): 'barcode' | 'label' | 'none' {
  switch (mode.kind) {
    case 'aim':
    case 'reading-barcode':
    case 'front':
      return 'barcode';
    case 'looking-up':
    case 'found':
      // A typed number has no photo of a barcode to frame.
      return mode.photo ? 'barcode' : 'none';
    case 'label':
    case 'reading-label':
      return 'label';
    default:
      return 'none';
  }
}

/**
 * Finds the product for a barcode: our catalogue first, then Open Food
 * Facts, which saves it to the catalogue. null when neither knows it.
 * Throws only when our own catalogue cannot be reached. An Open Food Facts
 * failure (offline, slow, no ingredient list) just counts as "not found",
 * so the person can still add the product with two photos.
 */
async function findProduct(barcode: string): Promise<Found | null> {
  const product = await fetchProductByBarcode(barcode);
  if (product) return { productId: product.id, name: product.name, detail: productDetail(product) };

  let importedId: string | null = null;
  try {
    importedId = await importFromOpenFoodFacts(barcode);
  } catch (error) {
    console.warn('Open Food Facts lookup failed', error);
  }
  if (!importedId) return null;

  // Fetched again only for its name; the verdict opens either way.
  const imported = await fetchProductById(importedId).catch(() => null);
  return { productId: importedId, name: imported?.name ?? null, detail: imported ? productDetail(imported) : '' };
}

function openVerdict(productId: string, barcode: string) {
  router.push({ pathname: '/verdict', params: { productId, barcode } });
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
  // The drawer to type the number, what has been typed, and whether it is looking.
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState<string | undefined>();
  const [finding, setFinding] = useState(false);

  // The two photos for a new product, and the name being read off the front.
  // Kept in refs, not the mode, so they survive a retake of the other photo.
  const frontPhoto = useRef<Taken | null>(null);
  const frontName = useRef<Promise<FrontRead | null> | null>(null);
  const labelPhoto = useRef<Taken | null>(null);

  // The pause on the found product before its verdict opens.
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Coming back to this tab (for example from a verdict) starts a fresh scan.
  // Leaving it cancels a verdict that was about to open.
  useFocusEffect(
    useCallback(() => {
      // The flashlight starts as set on Profile > Settings. You can still
      // switch it on the camera panel.
      setTorchOn(currentDeviceSettings().flashlight === 'on');
      misses.current = 0;
      frontPhoto.current = null;
      frontName.current = null;
      labelPhoto.current = null;
      setMode({ kind: 'aim', missed: false });
      return () => {
        if (holdTimer.current) clearTimeout(holdTimer.current);
        setTorchOn(false);
        setTyping(false);
      };
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

  /** Looks up a barcode read from a photo, showing its number as it goes. */
  async function lookUp(barcode: string, photo: Taken) {
    setMode({ kind: 'looking-up', barcode, photo });
    try {
      const found = await findProduct(barcode);
      showResult(barcode, photo, found);
    } catch {
      setProblem(LOOKUP_FAILED);
      setMode({ kind: 'aim', missed: false });
    }
  }

  /**
   * After a lookup. Found: show its name for a moment, then open its
   * verdict. Not found: ask for the front of the pack to add it.
   */
  function showResult(barcode: string, photo: Taken | null, found: Found | null) {
    if (!found) {
      setMode({ kind: 'front', barcode, read: null, problem: null });
      return;
    }
    hapticSuccess();
    if (!found.name) {
      openVerdict(found.productId, barcode);
      return;
    }
    setMode({ kind: 'found', barcode, photo, name: found.name, detail: found.detail });
    holdTimer.current = setTimeout(() => openVerdict(found.productId, barcode), motion.resultHold);
  }

  function openTyping() {
    setTyped('');
    setTypedError(undefined);
    setTyping(true);
  }

  function closeTyping() {
    // Not while it is looking: the answer is on its way.
    if (finding) return;
    setTyping(false);
    // Start counting again, so the next miss explains before it reopens.
    misses.current = 0;
  }

  /**
   * "Find this product" in the drawer. The button shows it is looking; the
   * drawer stays open until there is an answer, and keeps a failure in the
   * field so the number does not have to be typed again.
   */
  async function findTyped() {
    const barcode = parseTypedBarcode(typed);
    if (!barcode) {
      setTypedError('Type the 8, 12 or 13 numbers printed under the bars');
      return;
    }
    setFinding(true);
    try {
      const found = await findProduct(barcode);
      setTyping(false);
      misses.current = 0;
      showResult(barcode, null, found);
    } catch {
      setTypedError(LOOKUP_FAILED);
    } finally {
      setFinding(false);
    }
  }

  /** "Photograph the ingredient list" in the drawer: a verdict with no barcode. */
  function photographWithoutBarcode() {
    setTyping(false);
    misses.current = 0;
    setMode({ kind: 'label', barcode: null, problem: null });
  }

  /** The shutter on the front of the pack: freeze it, then check it. */
  async function photographFront() {
    if (mode.kind !== 'front') return;
    const { barcode, read } = mode;
    setNotice(null);
    const front = await takePhoto();
    if (front) setMode({ kind: 'check-front', barcode, read, front });
    // A notice, not a problem: the problem's Retry would start a fresh scan.
    else setNotice(CAMERA_FAILED);
  }

  /**
   * "Use this photo" on the front. Starts reading the product name off it
   * now, so it is ready by the time the ingredient list is read. Then the
   * ingredient list, unless we already have it.
   */
  function acceptFront(barcode: string, read: LabelRead | null, front: Taken) {
    frontPhoto.current = front;
    frontName.current = readFront({ imageBase64: front.base64, mimeType: 'image/jpeg' }).catch((error) => {
      console.warn('Could not read the front of the pack', error);
      return null;
    });
    if (read && labelPhoto.current) addNewProduct(barcode, read, front);
    else setMode({ kind: 'label', barcode, problem: null });
  }

  /** The shutter on the ingredient list: freeze it and read it straight away. */
  async function photographLabel() {
    if (mode.kind !== 'label') return;
    const { barcode } = mode;
    setNotice(null);
    const label = await takePhoto();
    if (!label) {
      setNotice(CAMERA_FAILED);
      return;
    }
    setMode({ kind: 'reading-label', barcode, label });

    try {
      const read = await readLabel({ imageBase64: label.base64, mimeType: 'image/jpeg' });
      if (!read.readable) {
        setMode({
          kind: 'label',
          barcode,
          problem: read.problem ?? 'Fit the whole list inside the frame, flat and out of glare, and try again.',
        });
        return;
      }
      if (!barcode) {
        openLabelVerdict(read, label);
        return;
      }
      labelPhoto.current = label;
      addNewProduct(barcode, read, label);
    } catch (error) {
      setMode({
        kind: 'label',
        barcode,
        problem: error instanceof LabelReadError ? error.message : 'Check your connection and try again.',
      });
    }
  }

  /**
   * The verdict from the ingredient list alone, for a product with no
   * barcode. Nothing is added to the catalogue. The photo goes along to show
   * on the Verdict screen.
   */
  function openLabelVerdict(read: LabelRead, label: Taken) {
    hapticSuccess();
    router.push({ pathname: '/verdict', params: { label: JSON.stringify(read), photo: label.uri } });
  }

  /**
   * Adds the product with both photos and opens its verdict. Waits for the
   * name being read off the front. If the name would not read, the front is
   * retaken (the ingredient list is kept). If saving fails, the front photo
   * comes back to check, so one tap on "Use this photo" tries again.
   */
  async function addNewProduct(barcode: string, read: LabelRead, shown: Taken) {
    if (!member || !frontPhoto.current || !frontName.current || !labelPhoto.current) return;
    const front = frontPhoto.current;
    setNotice(null);
    setMode({ kind: 'adding', barcode, read, photo: shown });

    const name = await frontName.current;
    if (!name?.readable || !name.name) {
      setMode({
        kind: 'front',
        barcode,
        read,
        problem: `${name?.problem ?? 'The name was not clear in the photo.'} Fit the name inside the frame and try again.`,
      });
      return;
    }

    try {
      const productId = await addProduct({
        userId: member.id,
        barcode,
        front: { ...name, name: name.name },
        label: read,
        frontPhotoBase64: front.base64,
        labelPhotoBase64: labelPhoto.current.base64,
      });
      hapticSuccess();
      openVerdict(productId, barcode);
    } catch (error) {
      // Someone added this barcode first: open theirs.
      if (error instanceof ProductExistsError) {
        const existing = await fetchProductByBarcode(barcode).catch(() => null);
        if (existing) {
          openVerdict(existing.id, barcode);
          return;
        }
      }
      console.warn('Could not add the product', error);
      setNotice(error instanceof LabelReadError ? error.message : 'We could not add this product. Try again.');
      setMode({ kind: 'check-front', barcode, read, front });
    }
  }

  if (!permission) {
    // Still asking the phone what it allows.
    return <Screen>{null}</Screen>;
  }

  if (!permission.granted) {
    return (
      <Screen scroll={false}>
        {/* The TabBar hides on this tab, so the way out is the close button. */}
        <IconButton icon="close" accessibilityLabel="Close the scanner" onPress={() => router.navigate('/')} />
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
  const showsNumber = mode.kind === 'looking-up' || mode.kind === 'found';

  return (
    <Screen scroll={false}>
      <ScanFrame
        onClose={() => router.navigate('/')}
        torchOn={torchOn}
        onToggleTorch={() => setTorchOn((on) => !on)}
        message={messageFor(mode)}
        hint={hintFor(mode)}
        target={targetFor(mode)}
        scanning={mode.kind === 'reading-barcode' || mode.kind === 'reading-label'}
        readout={
          showsNumber ? (
            <BarcodeReadout key={mode.barcode} barcode={mode.barcode} done={mode.kind === 'found'} />
          ) : undefined
        }
        result={mode.kind === 'found' ? <FoundProduct name={mode.name} detail={mode.detail || undefined} /> : undefined}
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
          ) : showsNumber ? (
            // A typed number has no photo: dim the live camera behind the readout.
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceScrim }]} />
          ) : undefined
        }
        bottomAction={
          mode.kind === 'check-front' ? (
            <View style={styles.choice}>
              <View style={styles.choiceButton}>
                <Button
                  label="Retake"
                  variant="outlined"
                  fullWidth
                  onPress={() => setMode({ kind: 'front', barcode: mode.barcode, read: mode.read, problem: null })}
                />
              </View>
              <View style={styles.choiceButton}>
                <Button
                  label="Use this photo"
                  icon="check"
                  fullWidth
                  onPress={() => acceptFront(mode.barcode, mode.read, mode.front)}
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
            // Reading, looking up, found or adding: the shutter stays, greyed out.
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
        onClose={closeTyping}
        footer={
          <>
            <Button
              label="Find this product"
              size="large"
              fullWidth
              loading={finding}
              loadingLabel="Looking for this barcode"
              onPress={findTyped}
            />
            <Button
              label="No barcode? Photograph the ingredient list"
              variant="text"
              fullWidth
              disabled={finding}
              onPress={photographWithoutBarcode}
            />
          </>
        }>
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
          disabled={finding}
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
