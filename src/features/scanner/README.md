# Scanner

Point the camera at a barcode and get a verdict. This is the core feature, and it
only truly works on a physical phone through Expo Go.

- Uses `expo-camera`. The `ScanFrame` component owns the viewfinder (radius `xxl`,
  the area outside it dimmed with `opacity.scanDim`).
- **The scope pill is mandatory.** It shows which household profile the scan runs
  against. A scan against the wrong profile is the worst failure mode in the app.
- On a read: look up the barcode in `products`; if missing, offer "Add a product".
- Hands the product and active profile to `src/services/verdict`, then routes to
  the verdict screen.
