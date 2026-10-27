# Scanner

Point the camera at a barcode and get a verdict. This is the core feature, and it
only truly works on a physical phone through Expo Go.

- Uses `expo-camera`. The `ScanFrame` component owns the viewfinder (radius `xxl`,
  the area outside it dimmed with `opacity.scanDim`).
- **The scope pill is mandatory.** It shows which household profile the scan runs
  against. A scan against the wrong profile is the worst failure mode in the app.
- On a read: look up the barcode in `products`. If missing, ask the
  `import-open-food-facts` function to fetch it from Open Food Facts; it saves
  the product (no AI, no extra photo) and its verdict opens. If Open Food Facts
  does not have it either, ask for a label photo, then the front of the pack,
  to add the product (see `src/features/add-product`).
- A barcode scans by itself, with no tap. Every photo (label or front) is
  checked before it is used: the shutter buzzes and freezes the photo on the
  panel, with "Retake" and "Use this photo".
- Hands the product and active profile to `src/services/verdict`, then routes to
  the verdict screen.
