import { colors } from '../src/lib/theme';

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
      danger: '#DC2626',
      dangerLight: '#FEF2F2',
      success: '#16A34A',
      successLight: '#F0FDF4',
      warning: '#D97706',
    });
  });
});
