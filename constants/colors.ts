const lightColors = {
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  primaryLighter: '#EFF6FF',
  primaryDark: '#1D4ED8',
  accent: '#60A5FA',

  background: '#F0F6FF',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',

  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',

  white: '#FFFFFF',

  medColors: ['#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#059669', '#D97706'],
  listColors: ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706', '#0891B2'],
  noteColors: ['#FFF9C4', '#DBEAFE', '#D1FAE5', '#FCE7F3', '#EDE9FE', '#FFEDD5'],
};

const darkColors: typeof lightColors = {
  primary: '#3B82F6',
  primaryLight: '#1E3A5F',
  primaryLighter: '#16243A',
  primaryDark: '#60A5FA',
  accent: '#60A5FA',

  background: '#0B1220',
  card: '#16213A',
  border: '#27324A',
  borderLight: '#1E2A42',

  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',

  success: '#34D399',
  successLight: '#0F3D2E',
  warning: '#FBBF24',
  warningLight: '#3D2E0F',
  danger: '#F87171',
  dangerLight: '#3D1414',

  white: '#FFFFFF',

  medColors: ['#3B82F6', '#A78BFA', '#F472B6', '#F87171', '#34D399', '#FBBF24'],
  listColors: ['#3B82F6', '#A78BFA', '#34D399', '#F87171', '#FBBF24', '#22D3EE'],
  noteColors: ['#4A4423', '#1E3A5F', '#0F3D2E', '#3D1E33', '#2E1E47', '#3D2A14'],
};

export type ColorPalette = typeof lightColors;

export const Palettes: Record<'light' | 'dark', ColorPalette> = {
  light: lightColors,
  dark: darkColors,
};

export const Colors = lightColors;
