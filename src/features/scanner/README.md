# Scanner

Photograph a barcode and get a verdict. This is the core feature, and it only
truly works on a physical phone through Expo Go.

- Uses `expo-camera`. The `ScanFrame` component owns the viewfinder (radius
  `xxl`), which fills the screen: the TabBar hides on this tab and the close
  button goes back to Home.
- **Nothing is read until the shutter is pressed** (`ShutterButton`). The
  photo freezes on the panel, a lime line sweeps the brackets while the live
  camera reads the barcode (its `onBarcodeScanned` listens only for a moment
  after the press), and `BarcodeReadout` floats the number up above them.
  Reading the photo with `scanFromURLAsync` is only a fallback: on iOS it
  finds QR codes alone, so it cannot read a grocery barcode.
- **Found** (in `products`, or saved from Open Food Facts by the
  `import-open-food-facts` function): `FoundProduct` shows its name under the
  brackets for `motion.resultHold`, then the Verdict screen opens.
- **If the barcode will not read**, a `CameraMessage` says what to try. A
  second miss in a row opens a `BottomSheet` to type the number instead
  (`parseTypedBarcode` in `barcode.ts`). "Find this product" shows it is
  looking; the sheet closes once it knows. The sheet also offers "No barcode?
  Photograph the ingredient list", for a label-only verdict that is not saved.
- **Not in Njam yet**: a photo of the front of the pack, checked with "Retake"
  and "Use this photo", then a photo of the ingredient list, which is read
  straight away with no check. The name is read off the front while you take
  the second photo. The product is added unverified (see
  `src/features/add-product`) and its verdict opens.
- The message card is always in the same place: just under the close and
  torch buttons.
