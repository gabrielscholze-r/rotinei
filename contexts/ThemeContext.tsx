import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { ColorPalette, Palettes } from '../constants/colors';
import { getItem, setItem, KEYS } from '../lib/storage';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ColorPalette;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colors: Palettes.light,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    getItem<ThemeMode>(KEYS.THEME_MODE).then((saved) => {
      if (saved === 'light' || saved === 'dark') setModeState(saved);
    });
  }, []);

  function setMode(next: ThemeMode) {
    setModeState(next);
    setItem(KEYS.THEME_MODE, next);
  }

  const value = useMemo(
    () => ({ mode, colors: Palettes[mode], setMode }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
