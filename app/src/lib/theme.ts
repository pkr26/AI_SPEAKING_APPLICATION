export const colors = {
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
};

/** Shared layout tokens keep phone, large-text, and tablet screens coherent. */
export const layout = {
  screenPadding: 20,
  formMaxWidth: 560,
  contentMaxWidth: 760,
  minimumTarget: 44,
} as const;

export const radii = {
  input: 12,
  card: 16,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;
