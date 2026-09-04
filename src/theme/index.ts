import { DefaultTheme, DarkTheme, Theme } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';

export type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Valida un nombre de icono (que puede venir de la BD o del CSV) contra el
 * glyphMap real de Ionicons y devuelve un fallback seguro si es inválido.
 * Evita los warnings «not a valid icon name» en consola.
 */
const glyphKeys = new Set(Object.keys(Ionicons.glyphMap) as IconName[]);

/** Renombres de iconos antiguos/incorrectos a nombres válidos de Ionicons. */
const ICON_MIGRATIONS: Record<string, IconName> = {
  bank: 'business',
  building: 'business',
  phone: 'call',
  game: 'game-controller',
  swap: 'swap-horizontal',
  ellipsis: 'ellipsis-horizontal',
  doc: 'document-text',
  shield: 'shield-checkmark',
  analytics: 'stats-chart',
  'trending-up': 'trending-up',
};

export function safeIcon(name: string | null | undefined, fallback: IconName = 'pricetag'): IconName {
  if (!name) return fallback;
  const migrated = ICON_MIGRATIONS[name] ?? name;
  if (glyphKeys.has(migrated as IconName)) return migrated as IconName;
  return fallback;
}

/** Colores de acento seleccionables por el usuario (personalización). */
export const ACCENT_COLORS: { key: string; label: string; value: string }[] = [
  { key: 'green', label: 'Verde', value: '#2E9E6B' },
  { key: 'teal', label: 'Turquesa', value: '#0FA3A3' },
  { key: 'blue', label: 'Azul', value: '#3B7DD8' },
  { key: 'indigo', label: 'Índigo', value: '#5C6BC0' },
  { key: 'violet', label: 'Violeta', value: '#8B5CF6' },
  { key: 'pink', label: 'Rosa', value: '#EC4899' },
  { key: 'red', label: 'Rojo', value: '#E5484D' },
  { key: 'orange', label: 'Naranja', value: '#F2842B' },
  { key: 'amber', label: 'Ámbar', value: '#E9A13B' },
  { key: 'slate', label: 'Pizarra', value: '#64748B' },
];

export const DEFAULT_ACCENT = ACCENT_COLORS[0].value;

export function accentByKey(key: string | null | undefined): string {
  return ACCENT_COLORS.find((c) => c.key === key)?.value ?? DEFAULT_ACCENT;
}

/** Paleta de colores para pintar cuentas y categorías. */
export const SWATCHES: string[] = [
  '#2E9E6B', '#0FA3A3', '#3B7DD8', '#5C6BC0', '#8B5CF6',
  '#EC4899', '#E5484D', '#F2842B', '#E9A13B', '#8D6E63',
  '#64748B', '#0EA5E9', '#14B8A6', '#22C55E', '#A855F7',
  '#F43F5E', '#EF4444', '#F59E0B', '#84CC16', '#6366F1',
];

/** Iconos disponibles para cuentas. */
export const ACCOUNT_ICONS: IconName[] = [
  'wallet', 'card', 'cash', 'business', 'home', 'briefcase',
  'flower', 'gift', 'airplane', 'car', 'cart', 'fitness',
  'school', 'restaurant', 'medkit', 'paw', 'game-controller',
  'phone-portrait', 'shield-checkmark', 'trending-up', 'trending-down',
  'pie-chart', 'diamond', 'star', 'heart', 'rocket', 'bag-handle',
  'pricetag', 'library', 'boat',
];

/** Iconos disponibles para categorías. */
export const CATEGORY_ICONS: IconName[] = [
  'cart', 'restaurant', 'fast-food', 'cafe', 'car', 'bus', 'airplane',
  'home', 'flash', 'water', 'wifi', 'phone-portrait', 'tv', 'shirt',
  'medkit', 'fitness', 'school', 'book', 'game-controller', 'musical-notes',
  'film', 'gift', 'paw', 'cut', 'construct', 'briefcase', 'card', 'cash',
  'business', 'trending-up', 'repeat', 'people', 'happy', 'beer', 'bicycle',
  'pricetag', 'ellipsis-horizontal', 'flag', 'shield', 'document-text',
];

export interface ThemeColors {
  accent: string;
  accentSoft: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  positive: string;
  negative: string;
  transfer: string;
  warning: string;
  onAccent: string;
  overlay: string;
}

const POSITIVE = '#1FA971';
const NEGATIVE = '#E5484D';
const TRANSFER = '#3B7DD8';
const WARNING = '#E9A13B';

export function makeColors(accent: string, dark: boolean): ThemeColors {
  return dark
    ? {
        accent,
        accentSoft: accent + '26',
        bg: '#0E1013',
        surface: '#16191D',
        surfaceAlt: '#1E2227',
        card: '#16191D',
        text: '#ECEEF0',
        textMuted: '#8B9299',
        border: '#262B31',
        positive: '#37C98A',
        negative: '#F16A6F',
        transfer: '#5D9BEC',
        warning: WARNING,
        onAccent: '#FFFFFF',
        overlay: 'rgba(0,0,0,0.5)',
      }
    : {
        accent,
        accentSoft: accent + '1A',
        bg: '#F4F5F7',
        surface: '#FFFFFF',
        surfaceAlt: '#F0F1F4',
        card: '#FFFFFF',
        text: '#161A1D',
        textMuted: '#6B7280',
        border: '#E6E8EC',
        positive: POSITIVE,
        negative: NEGATIVE,
        transfer: TRANSFER,
        warning: WARNING,
        onAccent: '#FFFFFF',
        overlay: 'rgba(0,0,0,0.35)',
      };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
export const typography = {
  hero: { fontSize: 30, fontWeight: '800' as const },
  title: { fontSize: 20, fontWeight: '800' as const },
  section: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
};

export function navTheme(accent: string, dark: boolean): Theme {
  const c = makeColors(accent, dark);
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: accent,
      background: c.bg,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.negative,
    },
  };
}

/** Compat: algunos módulos viejos importan `palette`. */
export const palette = {
  green: POSITIVE,
  greenLight: '#37C98A',
  red: NEGATIVE,
  amber: WARNING,
  blue: TRANSFER,
  purple: '#8B5CF6',
  gray: '#6B7280',
  white: '#FFFFFF',
  black: '#111111',
};

export const accountColors: Record<string, string> = {
  bank: '#3B7DD8',
  cash: '#E9A13B',
  credit_card: '#E5484D',
  savings: '#2E9E6B',
  cajita: '#8B5CF6',
  cdt: '#0FA3A3',
  debt: '#E5484D',
  loan: '#F2842B',
};
