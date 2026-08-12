import { colors, layout, radii, spacing } from '../src/lib/theme';

describe('theme palette', () => {
  it('exposes the exact design tokens', () => {
    expect(colors).toStrictEqual({
      primary: '#4F46E5',
      primaryDark: '#4338CA',
      primaryLight: '#EEF2FF',
      background: '#F6F7FB',
      card: '#FFFFFF',
      text: '#111827',
      muted: '#6B7280',
      border: '#E5E7EB',
      danger: '#B91C1C',
      dangerLight: '#FEF2F2',
      success: '#16A34A',
      successLight: '#F0FDF4',
      warning: '#9A3412',
    });
  });

  it('provides responsive, touch-safe design tokens', () => {
    expect(layout).toEqual({
      screenPadding: 20,
      formMaxWidth: 560,
      contentMaxWidth: 760,
      minimumTarget: 44,
    });
    expect(radii).toEqual({ input: 12, card: 16, pill: 999 });
    expect(spacing).toEqual({
      xs: 4,
      sm: 8,
      md: 12,
      lg: 20,
      xl: 24,
      xxl: 32,
    });
  });
});
