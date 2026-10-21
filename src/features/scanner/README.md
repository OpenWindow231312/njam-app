# Scanner

Photograph a barcode and get a verdict. This is the core feature, and it only
truly works on a physical phone through Expo Go.

- Uses `expo-camera`. The `ScanFrame` component owns the viewfinder (radius
  `xxl`), which fills the screen: the TabBar hides on this tab and the close
  button goes back to Home.
- **Nothing is read until the shutter is pressed** (`ShutterButton`). The
  photo freezes on the panel, `scanFromURLAsync` reads the barcode from it,
  and `BarcodeReadout` floats the number up above the brackets.
- **If the barcode will not read**, a `CameraMessage` says what to try. A
  second miss in a row opens a `BottomSheet` to type the number instead.
- On a read: look up the barcode in `products`; if missing, try Open Food
  Facts. Then ask for a photo of the front of the pack and, if Open Food Facts
  had no ingredients, a photo of the ingredient list
  (see `src/features/add-product`).
- Every photo is checked before it is used, shown whole, with "Retake" and
  "Use this photo" where the shutter was.
- The message card is always in the same place: just under the close and
  torch buttons.
