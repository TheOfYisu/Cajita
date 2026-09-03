import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  ThemeColors,
  makeColors,
  accentByKey,
  spacing,
  radius,
  typography,
} from './index';
import { getPrefs, setPrefs as persistPrefs, Prefs } from '../services/prefsService';

interface ThemeCtx {
  colors: ThemeColors;
  dark: boolean;
  prefs: Prefs;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  updatePrefs: (patch: Partial<Prefs>) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [prefs, setPrefsState] = useState<Prefs>(() => getPrefs());

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    persistPrefs(patch);
    setPrefsState((p) => ({ ...p, ...patch }));
  }, []);

  const dark =
    prefs.themeMode === 'system' ? systemScheme === 'dark' : prefs.themeMode === 'dark';
  const accent = accentByKey(prefs.accentKey);

  const value = useMemo<ThemeCtx>(
    () => ({
      colors: makeColors(accent, dark),
      dark,
      prefs,
      spacing,
      radius,
      typography,
      updatePrefs,
    }),
    [accent, dark, prefs, updatePrefs],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme must be used within ThemeProvider');
  return c;
}
