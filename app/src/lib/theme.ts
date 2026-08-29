import { StyleSheet, useColorScheme } from 'react-native';

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
  /** Shadow ink for elevated controls. */
  shadow: string;
}

/**
 * Light palette. The pre-dark-mode values are kept byte-for-byte apart from
 * `inputBorder`: #9CA3AF reached only 2.54 on the white field fill, short of
 * the 3:1 this module guarantees for non-text indicators, so it now carries
 * the muted ink. Dark mode only adds the on-fill/input tokens.
 * Key ratios: text/bg 16.6, muted/bg 4.52, onPrimary/primary 6.29,
 * onSuccess/success 5.02, success/successLight 4.79, danger/dangerLight 5.91,
 * primary/primaryLight 5.62, onWarning/warning 7.31, inputBorder/inputBg 4.83.
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
  shadow: '#000000',
};

/**
 * Dark palette — designed, not inverted. Surfaces sit in the #0F1417 family
 * with an elevated card; accents are re-tuned as light tints so accent TEXT
 * stays legible on dark surfaces, while fills pair with dark on-fill ink
 * (white-on-tint would fail 4.5:1). Pressed states shift lighter, not darker.
 * Key ratios: text/bg 16.3, muted/bg 7.57, onPrimary/primary 8.02,
 * onSuccess/success 8.55, success/successLight 8.39, danger/dangerLight 5.72,
 * primary/primaryLight 6.91, onWarning/warning 9.28, inputBorder/inputBg 4.09.
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
  shadow: '#000000',
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

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  layout: typeof layout;
}

/** Built once per scheme so consumers get referentially stable themes. */
const themes: Record<ColorScheme, Theme> = {
  light: { scheme: 'light', colors: lightColors, spacing, radii, layout },
  dark: { scheme: 'dark', colors: darkColors, spacing, radii, layout },
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
