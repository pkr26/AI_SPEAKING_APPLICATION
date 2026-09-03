import { Easing, StyleSheet, useColorScheme } from 'react-native';

/**
 * Design tokens for both color schemes.
 *
 * Every pair that carries meaning is contrast-checked (WCAG 2.1): 4.5:1 for
 * normal text, 3:1 for large text and non-text indicators. The ratios quoted
 * below are computed, not eyeballed, and are pinned by `__tests__/theme-test`.
 */
export interface ThemeColors {
  /** Brand accent: filled buttons, links, focus borders, accent text. */
  primary: string;
  /** Pressed-state shift of `primary` (darker in light, lighter in dark). */
  primaryDark: string;
  /** Subtle primary-tinted surface for chips, banners, pressed outlines. */
  primaryLight: string;
  /** Text/icon color on a `primary` fill. */
  onPrimary: string;
  background: string;
  /** Elevated card surface. */
  card: string;
  /** Body ink. */
  text: string;
  /** Secondary ink. */
  muted: string;
  /**
   * Secondary ink for text sitting on a tinted fill (primaryLight,
   * accentLight, successLight, dangerLight): darker than `muted` in light so
   * it clears 4.5:1 on every tint (plain `muted` fails on primaryLight and
   * dangerLight); equal to `muted` in dark, where the tints are dark fills.
   */
  mutedTint: string;
  /** Decorative hairlines and dividers. */
  border: string;
  /** Form-field border: stronger than `border` for non-text contrast. */
  inputBorder: string;
  /** Form-field fill (white in light, recessed surface in dark). */
  inputBackground: string;
  danger: string;
  dangerLight: string;
  /** Text/icon color on a `danger` fill (mic dot, stop icon, delete CTA). */
  onDanger: string;
  /** Translucent danger halo behind the recording mic button. */
  dangerPulse: string;
  success: string;
  successLight: string;
  /** Text/icon color on a `success` fill. */
  onSuccess: string;
  warning: string;
  /** Text/icon color on a `warning` fill. */
  onWarning: string;
  /**
   * Warm celebration accent: streaks, rewards, level-ups. Kept separate from
   * `primary` so the brand indigo stays calm while achievements feel warm.
   */
  accent: string;
  /** Pressed-state shift of `accent` (darker in light, lighter in dark). */
  accentDark: string;
  /** Subtle accent-tinted surface for chips and celebration panels. */
  accentLight: string;
  /** Text/icon color on an `accent` fill. */
  onAccent: string;
  /** Shadow ink for elevated controls. */
  shadow: string;
  /**
   * Full-screen scrim behind modal overlays. Kept as a token so the one
   * overlay in the app (ClientUpgradeModal) cannot drift from the palette.
   */
  scrim: string;
}

/**
 * Light palette. The pre-dark-mode values are kept byte-for-byte apart from
 * `inputBorder`: #9CA3AF reached only 2.54 on the white field fill, short of
 * the 3:1 this module guarantees for non-text indicators, so it now carries
 * the muted ink. Dark mode only adds the on-fill/input tokens.
 * Key ratios: text/bg 16.6, muted/bg 4.52, onPrimary/primary 6.29,
 * onSuccess/success 5.02, success/successLight 4.79, danger/dangerLight 5.91,
 * primary/primaryLight 5.62, onWarning/warning 7.31, inputBorder/inputBg 4.83.
 * mutedTint clears 4.5:1 on every tinted fill: primaryLight 6.76,
 * dangerLight 6.91, accentLight 7.29, successLight 7.22, card 7.56.
 * Accent family (amber-700): onAccent/accent 5.02, accent/background 4.69,
 * accent/card 5.02, accent/accentLight 4.84, onAccent/accentDark 7.09.
 */
export const lightColors: ThemeColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#EEF2FF',
  onPrimary: '#FFFFFF',
  background: '#F6F7FB',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  mutedTint: '#4B5563',
  border: '#E5E7EB',
  inputBorder: '#6B7280',
  inputBackground: '#FFFFFF',
  danger: '#B91C1C',
  dangerLight: '#FEF2F2',
  onDanger: '#FFFFFF',
  dangerPulse: 'rgba(220, 38, 38, 0.25)',
  success: '#15803D',
  successLight: '#F0FDF4',
  onSuccess: '#FFFFFF',
  warning: '#9A3412',
  onWarning: '#FFFFFF',
  accent: '#B45309',
  accentDark: '#92400E',
  accentLight: '#FFFBEB',
  onAccent: '#FFFFFF',
  shadow: '#000000',
  scrim: 'rgba(0, 0, 0, 0.66)',
};

/**
 * Dark palette — designed, not inverted. Surfaces sit in the #0F1417 family
 * with an elevated card; accents are re-tuned as light tints so accent TEXT
 * stays legible on dark surfaces, while fills pair with dark on-fill ink
 * (white-on-tint would fail 4.5:1). Pressed states shift lighter, not darker.
 * Key ratios: text/bg 16.3, muted/bg 7.57, onPrimary/primary 8.02,
 * onSuccess/success 8.55, success/successLight 8.39, danger/dangerLight 5.72,
 * primary/primaryLight 6.91, onWarning/warning 9.28, inputBorder/inputBg 4.09.
 * mutedTint on the tinted fills: primaryLight 5.63, dangerLight 6.46,
 * accentLight 6.14, successLight 5.97, card 6.63.
 * Accent family (amber-400 fill with amber-950 ink): onAccent/accent 8.97,
 * accent/background 11.11, accent/card 9.72, accent/accentLight 9.00,
 * onAccent/accentDark 12.03.
 */
export const darkColors: ThemeColors = {
  primary: '#A5B4FC',
  primaryDark: '#C7D2FE',
  primaryLight: '#232B4D',
  onPrimary: '#1E1B4B',
  background: '#0F1417',
  card: '#1A2129',
  text: '#ECF1F7',
  muted: '#9BA7B4',
  mutedTint: '#9BA7B4',
  border: '#2A333D',
  inputBorder: '#6E7B89',
  inputBackground: '#131920',
  danger: '#F87171',
  dangerLight: '#3A181C',
  onDanger: '#450A0A',
  dangerPulse: 'rgba(248, 113, 113, 0.28)',
  success: '#4ADE80',
  successLight: '#132E1D',
  onSuccess: '#052E16',
  warning: '#FDBA74',
  onWarning: '#431407',
  accent: '#FBBF24',
  accentDark: '#FDE68A',
  accentLight: '#33240A',
  onAccent: '#451A03',
  shadow: '#000000',
  scrim: 'rgba(0, 0, 0, 0.66)',
};

/**
 * Static light palette kept for scheme-independent call sites (tests, docs).
 * Screens and components consume `useTheme()` instead.
 */
export const colors = lightColors;

/** Shared layout tokens keep phone, large-text, and tablet screens coherent. */
export const layout = {
  screenPadding: 20,
  formMaxWidth: 560,
  contentMaxWidth: 760,
  // Apple accepts 44pt while Material recommends 48dp. Using the larger
  // cross-platform target makes compact controls easier for motor-impaired
  // learners without branching every component by platform.
  minimumTarget: 48,
  /** One diameter for every brand-mark circle (auth mic badges, empty-state icon). */
  brandMark: 68,
  /** Diameter of the diagnostic/feedback outcome badge circles. */
  outcomeBadge: 84,
} as const;

export const radii = {
  /** Badges and small chips. */
  badge: 8,
  /** Form fields, banners, and inline notices. */
  input: 12,
  /** Buttons (the shared Button component). */
  button: 14,
  card: 16,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  /** The 16px step between md and lg (bars, compact button padding). */
  ml: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

/**
 * The type scale. Sizes are consolidated from the 21 ad-hoc per-screen values
 * into named roles so hierarchy comes from the scale, not per-file tuning.
 * `bodyLg` matches the HIG body convention (17pt) and `body` Material's
 * Body Large (16sp); both sit above the former 14–15pt default that made
 * screens read as fine print.
 */
export const type = {
  /** Celebration numerals and hero moments. */
  display: { fontSize: 34, lineHeight: 41 } as const,
  /** Level reveals and large outcomes. */
  titleLg: { fontSize: 28, lineHeight: 34 } as const,
  /** Screen-level headlines (feedback titles, level). */
  title: { fontSize: 24, lineHeight: 30 } as const,
  /** Card and section titles. */
  headline: { fontSize: 20, lineHeight: 26 } as const,
  /** Primary CTA label (the shared Button's hero `lg` size). */
  hero: { fontSize: 18, lineHeight: 24 } as const,
  /** Primary content text (HIG body). */
  bodyLg: { fontSize: 17, lineHeight: 24 } as const,
  /** Supporting content text (Material body large). */
  body: { fontSize: 16, lineHeight: 23 } as const,
  /** Compact supporting copy. */
  callout: { fontSize: 15, lineHeight: 21 } as const,
  /** Captions, helper lines. */
  footnote: { fontSize: 13, lineHeight: 18 } as const,
  /** Uppercase labels, badges, chips. */
  caption: { fontSize: 12, lineHeight: 16 } as const,
} as const;

/**
 * Motion durations (ms) and easings, restricted to what the app consumes:
 * every token here has at least one caller (unused tokens were dropped so the
 * scale stays honest). NN/g's research range for interface motion is
 * 100–500ms: ~100ms for state feedback, 200–300ms for entrances;
 * celebrations alone may exceed the plain range.
 */
export const motion = {
  /** Entrances, layout changes, sheet-like transitions. */
  base: 220,
  /** Celebrations and hero moments. */
  slow: 340,
  easing: {
    /** Fast-out slow-in: entering elements settle (NN/g recommendation). */
    decelerate: Easing.bezier(0.05, 0.7, 0.1, 1),
    /** Accelerating exit. */
    accelerate: Easing.bezier(0.3, 0, 1, 1),
  },
} as const;

export type ColorScheme = 'light' | 'dark';

/**
 * Elevation presets, tuned per scheme: light casts soft shadows, dark leans on
 * a stronger cast plus the elevated card fill (black shadows vanish on the
 * dark background). `resting` cards stay quiet; `raised` is for floating
 * controls (record button, banners, the tab bar).
 */
export interface ThemeElevation {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
}

export const elevations: Record<ColorScheme, { resting: ThemeElevation; raised: ThemeElevation }> =
  {
    light: {
      resting: {
        shadowColor: '#000000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      },
      raised: {
        shadowColor: '#000000',
        shadowOpacity: 0.16,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
      },
    },
    dark: {
      resting: {
        shadowColor: '#000000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      },
      raised: {
        shadowColor: '#000000',
        shadowOpacity: 0.5,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
      },
    },
  };

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  layout: typeof layout;
  type: typeof type;
  motion: typeof motion;
  elevation: { resting: ThemeElevation; raised: ThemeElevation };
}

/** Built once per scheme so consumers get referentially stable themes. */
const themes: Record<ColorScheme, Theme> = {
  light: {
    scheme: 'light',
    colors: lightColors,
    spacing,
    radii,
    layout,
    type,
    motion,
    elevation: elevations.light,
  },
  dark: {
    scheme: 'dark',
    colors: darkColors,
    spacing,
    radii,
    layout,
    type,
    motion,
    elevation: elevations.dark,
  },
};

/**
 * Resolves the active theme from the OS color scheme (app.json opts into
 * `userInterfaceStyle: "automatic"`). Unknown/null schemes fall back to light.
 */
export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/**
 * Wraps a theme→styles factory with a per-scheme StyleSheet cache so themed
 * screens keep module-level-style performance:
 *
 *   const themedStyles = createThemedStyles(({ colors }) => ({ ... }));
 *   const styles = themedStyles(useTheme());
 */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): (theme: Theme) => T {
  const cache: Partial<Record<ColorScheme, T>> = {};
  return (theme) => (cache[theme.scheme] ??= StyleSheet.create(factory(theme)));
}
