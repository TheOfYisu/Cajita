import { getDb } from '../db/database';

export interface Prefs {
  userName: string;
  accentKey: string;
  themeMode: 'system' | 'light' | 'dark';
  hideBalances: boolean;
  monthStartDay: number;
  currency: string;
  onboarded: boolean;
  notificationsEnabled: boolean;
  defaultLeadDays: number;
}

const DEFAULTS: Prefs = {
  userName: '',
  accentKey: 'green',
  themeMode: 'system',
  hideBalances: false,
  monthStartDay: 1,
  currency: 'COP',
  onboarded: false,
  notificationsEnabled: true,
  defaultLeadDays: 3,
};

const PREFIX = 'pref:';

export function getPrefs(): Prefs {
  const db = getDb();
  const rows = db.getAllSync<{ key: string; value: string }>(
    `SELECT key, value FROM sync_metadata WHERE key LIKE '${PREFIX}%'`,
  );
  const out: Prefs = { ...DEFAULTS };
  for (const r of rows) {
    const k = r.key.slice(PREFIX.length) as keyof Prefs;
    if (!(k in DEFAULTS)) continue;
    const def = DEFAULTS[k];
    if (typeof def === 'boolean') (out[k] as boolean) = r.value === '1';
    else if (typeof def === 'number') (out[k] as number) = Number(r.value) || def;
    else (out[k] as string) = r.value;
  }
  return out;
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  const db = getDb();
  const v = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
  db.runSync(
    `INSERT INTO sync_metadata (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [PREFIX + key, v],
  );
}

export function setPrefs(patch: Partial<Prefs>): void {
  for (const [k, v] of Object.entries(patch)) {
    setPref(k as keyof Prefs, v as never);
  }
}
