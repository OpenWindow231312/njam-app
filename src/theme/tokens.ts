/**
 * Njam design tokens.
 *
 * Generated from the Njam Design System artifact (tokens.json, version 1).
 * https://claude.ai/artifact/3gFmougXCaYTd2YWEP8VYy
 *
 * This file is the only place a raw hex code, pixel size, radius or spacing
 * value may appear in the app. Screens and components import from here.
 * If something you need is missing, add it to the artifact first, then mirror
 * it into this file. Do not improvise a value in a screen.
 *
 * Web values from the artifact are expressed here in React Native terms:
 * sizes are unitless numbers, em letter-spacing is converted to points at the
 * style's own font size, and CSS box-shadows are expressed as RN shadow props.
 */

export type ThemeName = 'light' | 'dark';

/* ------------------------------------------------------------------ */
/* Colour                                                              */
/* ------------------------------------------------------------------ */

/**
 * Two themes: Paper (light) and Forest (dark).
 * Both ship complete. Check every screen in dark before calling it done.
 */
export const colors = {
  light: {
    /** Page background on every screen. Never pure white. */
    surface: '#f5f4ee',
    /** Cards, list rows, bottom sheets: anything sitting on surface. */
    surfaceRaised: '#eae9e0',
    /** Inset wells: viewfinder ground, search bars, meter tracks. */
    surfaceSunken: '#e1e0d5',
    /** Deliberately flipped panels: splash, onboarding hero, verdict header strip. */
    surfaceInverse: '#04291c',
    /** Dimmer behind sheets and modals. Never a decorative wash. */
    surfaceScrim: 'rgba(4, 41, 28, 0.55)',

    /** Body and heading copy. */
    ink: '#14201a',
    /** Supporting copy, helper text, inactive tab labels. */
    inkMuted: '#4a574f',
    /** Captions, timestamps, unit suffixes. The quietest text allowed. */
    inkSubtle: '#5f6c63',
    /** Copy on surfaceInverse and on any solid brandForest fill. */
    inkInverse: '#f5f4ee',

    /** Fixed identity green. Logo tile, splash ground, dark app bars. */
    brandForest: '#04291c',
    /** Fixed mid green. Secondary pills and supporting brand fills. */
    brandForestMid: '#0a5b33',
    /** The single accent, fixed in both themes. */
    brandLime: '#bef842',
    /** Decorative only. Below 4.5:1 on surface, so never set copy in it. */
    brandLimeDeep: '#8cc63e',
    /** Fixed identity paper, theme-locked unlike surface. */
    brandPaper: '#f5f4ee',

    /** Primary button and selected-state fill. Pair with onAction. */
    action: '#04291c',
    actionHover: '#0a5b33',
    actionPressed: '#021b12',
    /** Label and icon on action, actionHover, actionPressed. */
    onAction: '#f5f4ee',
    /** Secondary button and selected chip fill. */
    actionTonal: '#dce8d8',
    onActionTonal: '#04291c',

    /** Section tags, scan ring, progress fills, centre tab circle. Never a full-screen fill. */
    accent: '#bef842',
    /** Label and icon on any accent or verdictSafe fill, in both themes. */
    onAccent: '#04291c',
    /** Decorative only, same caution as brandLimeDeep. */
    accentQuiet: '#8cc63e',

    /** Safe verdict fill. Pair with onAccent. */
    verdictSafe: '#bef842',
    /** Safe wording and icon when set on surface rather than on the fill. */
    verdictSafeInk: '#0a5b33',
    /** Caution verdict fill. Pair with onVerdictCaution. Never layout colour. */
    verdictCaution: '#d98f2b',
    onVerdictCaution: '#14201a',
    verdictCautionInk: '#8a5410',
    /** Not-safe verdict fill. Pair with onVerdictUnsafe. Never layout colour. */
    verdictUnsafe: '#a83a22',
    onVerdictUnsafe: '#f5f4ee',
    verdictUnsafeInk: '#a83a22',

    /** Hairline dividers. Decorative separation only. */
    line: '#d7d5c9',
    /** Borders that carry meaning: field outlines, outlined buttons, unselected chips. */
    lineStrong: '#7a857c',
    /** The 2px focus ring. Solid, never a soft glow. */
    focusRing: '#0a5b33',

    stateHoverOverlay: 'rgba(4, 41, 28, 0.06)',
    statePressedOverlay: 'rgba(4, 41, 28, 0.12)',
  },

  dark: {
    surface: '#04291c',
    surfaceRaised: '#0b3724',
    surfaceSunken: '#021b12',
    surfaceInverse: '#f5f4ee',
    surfaceScrim: 'rgba(2, 17, 11, 0.72)',

    ink: '#cfe6d8',
    inkMuted: '#9dc2ac',
    inkSubtle: '#7fa791',
    inkInverse: '#14201a',

    brandForest: '#04291c',
    brandForestMid: '#0a5b33',
    brandLime: '#bef842',
    brandLimeDeep: '#8cc63e',
    brandPaper: '#f5f4ee',

    action: '#bef842',
    actionHover: '#d2ff6e',
    actionPressed: '#a9e22f',
    onAction: '#04291c',
    actionTonal: '#123f2a',
    onActionTonal: '#cfe6d8',

    accent: '#bef842',
    onAccent: '#04291c',
    accentQuiet: '#8cc63e',

    verdictSafe: '#bef842',
    verdictSafeInk: '#bef842',
    verdictCaution: '#d98f2b',
    onVerdictCaution: '#14201a',
    verdictCautionInk: '#e9a94f',
    verdictUnsafe: '#a83a22',
    onVerdictUnsafe: '#f5f4ee',
    verdictUnsafeInk: '#e8836a',

    line: '#16452f',
    lineStrong: '#4e7a62',
    focusRing: '#bef842',

    stateHoverOverlay: 'rgba(190, 248, 66, 0.10)',
    statePressedOverlay: 'rgba(190, 248, 66, 0.18)',
  },
} as const;

export type ColorTokens = (typeof colors)['light'];

/** Resolve a theme. Pass the value from RN's useColorScheme(). */
export const getColors = (scheme: ThemeName | null | undefined): ColorTokens =>
  scheme === 'dark' ? colors.dark : colors.light;

/* ------------------------------------------------------------------ */
/* Type                                                                */
/* ------------------------------------------------------------------ */

/**
 * Two families and no more.
 * display = Bricolage Grotesque: headlines, numerals, button labels, verdict words.
 * text    = Figtree: everything read in sentences, including ingredient lists.
 *
 * Names match the exports of @expo-google-fonts/bricolage-grotesque and
 * @expo-google-fonts/figtree. Load them with useFonts() before rendering.
 */
export const fontFamilies = {
  displayBold: 'BricolageGrotesque_700Bold',
  displayExtraBold: 'BricolageGrotesque_800ExtraBold',
  textRegular: 'Figtree_400Regular',
  textMedium: 'Figtree_500Medium',
  textSemiBold: 'Figtree_600SemiBold',
  textBold: 'Figtree_700Bold',
} as const;

export const typography = {
  /** Splash and onboarding hero only. One per screen. */
  displayXl: {
    fontFamily: fontFamilies.displayExtraBold,
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -0.97,
  },
  /** The screen headline in SectionHeader. */
  displayL: {
    fontFamily: fontFamilies.displayExtraBold,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.75,
  },
  /** Bottom sheet titles and the verdict headline. */
  displayM: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.52,
  },
  /** Card headlines and product names on ProductCard. */
  headline: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  /** ListRow titles and group headings. */
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.17,
  },
  /** Every button label at default size. */
  button: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.08,
  },
  /** Small and inline button labels. */
  buttonS: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },

  /** The verdict reason list and onboarding explanations. */
  bodyL: {
    fontFamily: fontFamilies.textRegular,
    fontSize: 16,
    lineHeight: 25,
    letterSpacing: 0,
  },
  /** Default running text everywhere else. */
  body: {
    fontFamily: fontFamilies.textRegular,
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0,
  },
  /** Supporting lines under a title in ListRow and ProductCard. */
  bodyS: {
    fontFamily: fontFamilies.textRegular,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0,
  },
  /** Field labels, chip labels and tab labels. */
  label: {
    fontFamily: fontFamilies.textSemiBold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.13,
  },
  /** Timestamps, attribution and unit suffixes. */
  caption: {
    fontFamily: fontFamilies.textMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  /** Set in capitals. Section tags and table headers only. */
  overline: {
    fontFamily: fontFamilies.textBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },

  /** The single number a nutrient sheet is about. */
  metricXl: {
    fontFamily: fontFamilies.displayExtraBold,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -1.2,
  },
  /** Counts in NutrientMeter, household tallies, scan history totals. */
  metric: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.44,
  },
} as const;

/* ------------------------------------------------------------------ */
/* Spacing — a 4px base grid                                           */
/* ------------------------------------------------------------------ */

export const space = {
  /** Gap between an icon and its own label. */
  s1: 4,
  /** Chip padding, gap between chips in a row. */
  s2: 8,
  /** Vertical rhythm inside a card, gap between stacked chips. */
  s3: 12,
  /** Card padding and the gap between cards in a list. */
  s4: 16,
  /** The screen gutter. Matches layout.screenGutter. */
  s5: 20,
  /** Bottom sheet padding and the gap between form groups. */
  s6: 24,
  /** Space under a SectionHeader before its first child. */
  s7: 28,
  /** Gap between major blocks on a scrolling screen. */
  s8: 32,
  /** Space above a screen's primary action. */
  s10: 40,
  /** Empty state breathing room. */
  s12: 48,
  /** Onboarding hero top inset. */
  s16: 64,
} as const;

/* ------------------------------------------------------------------ */
/* Radius — signals role, never applied uniformly                      */
/* ------------------------------------------------------------------ */

export const radius = {
  /** Full-bleed camera surfaces and edge-to-edge dividers. */
  none: 0,
  /** Meter tracks, severity dots, inline swatches. */
  xs: 4,
  /** Product thumbnails and dense tiles. */
  sm: 8,
  /** Text fields, outlined buttons, small surfaces. */
  md: 12,
  /** Cards, list-row groups, verdict banners. */
  lg: 16,
  /** Bottom sheets and modals, top corners only. */
  xl: 24,
  /** The scanner frame and the onboarding hero panel. */
  xxl: 28,
  /** Every chip, every filled button, the centre scan circle. */
  pill: 999,
} as const;

/* ------------------------------------------------------------------ */
/* Shadow — elevation only                                             */
/* ------------------------------------------------------------------ */

/**
 * A card, a chip or a button never carries a shadow in Njam.
 * Elevation exists in three places: the verdict bottom sheet, modals, the snackbar.
 * RN radius is half the CSS blur; elevation is the Android approximation.
 */
export const shadow = {
  light: {
    /** The bottom sheet that carries a verdict. Cast upward. */
    sheet: {
      shadowColor: '#04291c',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 12,
    },
    /** Centred modals and the household switcher popover. */
    modal: {
      shadowColor: '#04291c',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.24,
      shadowRadius: 20,
      elevation: 16,
    },
    /** Snackbar and dropdown menus. */
    menu: {
      shadowColor: '#04291c',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 9,
      elevation: 8,
    },
  },
  dark: {
    sheet: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.55,
      shadowRadius: 14,
      elevation: 12,
    },
    modal: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.62,
      shadowRadius: 20,
      elevation: 16,
    },
    menu: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 9,
      elevation: 8,
    },
  },
} as const;

export const getShadows = (scheme: ThemeName | null | undefined) =>
  scheme === 'dark' ? shadow.dark : shadow.light;

/* ------------------------------------------------------------------ */
/* Icon — Material Symbols Rounded variable axes                       */
/* ------------------------------------------------------------------ */

/**
 * Material Symbols Rounded is the single icon family.
 * Selection is carried by fillOn plus a colour change, never by swapping icon.
 * The three verdict marks are the exception and live in assets/Verdict.
 */
export const icon = {
  /** Icons inside chips and small buttons. */
  sizeSm: 20,
  /** The default. List rows, buttons, tab bar, text fields. */
  sizeMd: 24,
  /** Verdict headers and the centre scan tab. */
  sizeLg: 32,
  /** Empty states and onboarding steps. */
  sizeXl: 40,

  /** wght axis at rest, including inactive tabs. */
  weight: 400,
  /** wght axis on an active tab or a pressed icon button. */
  weightEmphasis: 600,
  /** FILL axis at rest. Outlined. */
  fillOff: 0,
  /** FILL axis when selected. */
  fillOn: 1,
  /** GRAD axis on surface. Raise to 25 for small icons on brandForest if they look thin. */
  grade: 0,
  /** opsz axis. Match it to the rendered size. */
  optical: 24,
} as const;

/* ------------------------------------------------------------------ */
/* Layout — phone first, one column                                    */
/* ------------------------------------------------------------------ */

export const layout = {
  /** Left and right inset on every screen. */
  screenGutter: 20,
  /** Minimum hit area for anything tappable, including 24px icon buttons. */
  touchTargetMin: 48,
  /** TabBar height, excluding the safe area inset. */
  tabBarHeight: 64,
  /** Top app bar height. */
  appBarHeight: 56,
  /** The square barcode target inside ScanFrame. */
  scanFrameSize: 240,
  /** Ceiling for an expanded bottom sheet, as a fraction of screen height. */
  sheetMaxHeight: 0.88,
  /** Cap the column on tablets so line length stays readable. */
  contentMaxWidth: 480,
} as const;

/* ------------------------------------------------------------------ */
/* Opacity                                                             */
/* ------------------------------------------------------------------ */

export const opacity = {
  /** Disabled buttons, chips and rows. Keep the layout, drop the weight. */
  disabled: 0.38,
  /** The darkened camera area outside the scan frame. */
  scanDim: 0.62,
  /** Ripple peak on a tonal or text button. */
  press: 0.12,
} as const;

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */

/** 160ms for a state change, 240ms for a sheet. No bouncing, no pulsing. */
export const motion = {
  stateChange: 160,
  sheet: 240,
} as const;

export const tokens = {
  colors,
  fontFamilies,
  typography,
  space,
  radius,
  shadow,
  icon,
  layout,
  opacity,
  motion,
} as const;

export default tokens;
