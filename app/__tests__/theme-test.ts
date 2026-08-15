import { colors, darkColors, layout, lightColors, radii, spacing } from '../src/lib/theme';
import type { ThemeColors } from '../src/lib/theme';

/** WCAG 2.1 relative luminance of a #RRGGBB hex color. */
function relativeLuminance(hex: string): number {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!match) throw new Error(`Expected an opaque #RRGGBB color, got ${hex}`);
  const [r, g, b] = [0, 2, 4].map((offset) => {
    const channel = parseInt(match[1].slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two opaque colors (1..21). */
function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme palette', () => {
  it('exposes the exact light design tokens (legacy values kept intact)', () => {
    expect(lightColors).toStrictEqual({
      primary: '#4F46E5',
      primaryDark: '#4338CA',
      primaryLight: '#EEF2FF',
      onPrimary: '#FFFFFF',
      background: '#F6F7FB',
      card: '#FFFFFF',
      text: '#111827',
      muted: '#6B7280',
      border: '#E5E7EB',
      // U-M1: form-field borders need 3:1 non-text contrast on white.
      inputBorder: '#9CA3AF',
      inputBackground: '#FFFFFF',
      danger: '#B91C1C',
      dangerLight: '#FEF2F2',
      onDanger: '#FFFFFF',
      dangerPulse: 'rgba(220, 38, 38, 0.25)',
      // U-M1: passes 4.5:1 with white text and 3:1 on the app background.
      success: '#15803D',
      successLight: '#F0FDF4',
      onSuccess: '#FFFFFF',
      warning: '#9A3412',
      onWarning: '#FFFFFF',
      shadow: '#000000',
    });
    // Legacy static export stays the light palette for scheme-independent uses.
    expect(colors).toBe(lightColors);
  });

  it('exposes the exact dark design tokens (designed, not naive inversion)', () => {
    expect(darkColors).toStrictEqual({
      primary: '#A5B4FC',
      // In dark the pressed shift goes lighter, not darker.
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
    });
  });

  it('keeps both palettes on the same token shape', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  describe.each([
    ['light', lightColors],
    ['dark', darkColors],
  ] as const)('%s scheme contrast (computed, WCAG 2.1)', (_scheme, palette: ThemeColors) => {
    // 4.5:1 — normal text.
    it.each([
      ['body ink on background', palette.text, palette.background],
      ['body ink on card', palette.text, palette.card],
      ['muted ink on background', palette.muted, palette.background],
      ['muted ink on card', palette.muted, palette.card],
      ['button label on primary', palette.onPrimary, palette.primary],
      ['button label on pressed primary', palette.onPrimary, palette.primaryDark],
      ['badge label on success', palette.onSuccess, palette.success],
      ['badge label on danger', palette.onDanger, palette.danger],
      ['badge label on warning', palette.onWarning, palette.warning],
      ['primary text on background', palette.primary, palette.background],
      ['primary text on card', palette.primary, palette.card],
      ['primary chip text on primaryLight', palette.primary, palette.primaryLight],
      ['success chip text on successLight', palette.success, palette.successLight],
      ['danger chip text on dangerLight', palette.danger, palette.dangerLight],
      ['danger text on background', palette.danger, palette.background],
      ['danger text on card', palette.danger, palette.card],
      ['success text on background', palette.success, palette.background],
      ['success text on card', palette.success, palette.card],
      ['warning text on background', palette.warning, palette.background],
      ['warning text on card', palette.warning, palette.card],
      ['banner text on primaryLight', palette.primaryDark, palette.primaryLight],
    ])('%s meets 4.5:1', (_pair, foreground, background) => {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    });

    // 3:1 — large text, focus borders, and non-text indicators.
    it.each([
      ['focus border on input background', palette.primary, palette.inputBackground],
      ['primary fill on background', palette.primary, palette.background],
      ['danger fill on background', palette.danger, palette.background],
      ['success meter fill on background', palette.success, palette.background],
      ['success progress fill on its track', palette.success, palette.border],
    ])('%s meets 3:1', (_pair, foreground, background) => {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(3);
    });
  });

  it('meets 3:1 for dark form-field borders on the dark input fill', () => {
    // The light value (#9CA3AF on white, ~2.5:1) is a pre-existing compromise
    // pinned by design; the dark palette must not repeat it.
    expect(contrastRatio(darkColors.inputBorder, darkColors.inputBackground)).toBeGreaterThanOrEqual(
      3,
    );
  });

  it('provides responsive, touch-safe design tokens', () => {
    expect(layout).toEqual({
      screenPadding: 20,
      formMaxWidth: 560,
      contentMaxWidth: 760,
      minimumTarget: 44,
    });
    expect(radii).toEqual({ badge: 8, input: 12, button: 14, card: 16, pill: 999 });
    expect(spacing).toEqual({
      xs: 4,
      sm: 8,
      md: 12,
      ml: 16,
      lg: 20,
      xl: 24,
      xxl: 32,
    });
  });
});
