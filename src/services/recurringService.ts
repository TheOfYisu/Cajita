import { getDb, Recurring, now, genUuid } from '../db/database';
import type { SQLiteBindParams } from 'expo-sqlite';
import { createTransaction } from './transactionService';

export const FREQUENCIES: { key: Recurring['frequency']; label: string; days: number }[] = [
  { key: 'weekly', label: 'Semanal', days: 7 },
  { key: 'biweekly', label: 'Quincenal', days: 14 },
  { key: 'monthly', label: 'Mensual', days: 30 },
  { key: 'quarterly', label: 'Trimestral', days: 91 },
  { key: 'yearly', label: 'Anual', days: 365 },
];

export function frequencyLabel(f: Recurring['frequency']): string {
  return FREQUENCIES.find((x) => x.key === f)?.label ?? f;
}

export function getRecurring(includeArchived = false): Recurring[] {
  const q = includeArchived
    ? `SELECT * FROM recurring WHERE deletedAt IS NULL ORDER BY nextRun`
    : `SELECT * FROM recurring WHERE deletedAt IS NULL AND isArchived = 0 ORDER BY nextRun`;
  return getDb().getAllSync<Recurring>(q);
}

export function getRecurringById(id: number): Recurring | null {
  return getDb().getFirstSync<Recurring>('SELECT * FROM recurring WHERE id = ?', [id]);
}

interface RecurringInput {
  title: string;
  amount: number;
  type: 'expense' | 'income';
  accountId: number;
  accountUuid: string;
  categoryId?: number | null;
  categoryUuid?: string | null;
  personId?: number | null;
  frequency: Recurring['frequency'];
  nextRun: number;
  leadDays?: number;
  notify?: boolean;
}

export function createRecurring(input: RecurringInput): Recurring {
  const db = getDb();
  const t = now();
  const uuid = genUuid();
  db.runSync(
    `INSERT INTO recurring
       (uuid, title, amount, type, accountId, accountUuid, categoryId, categoryUuid, personId,
        frequency, nextRun, leadDays, notify, isArchived, createdAt, updatedAt, syncState)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending')`,
    [uuid, input.title, Math.abs(input.amount), input.type, input.accountId, input.accountUuid,
     input.categoryId ?? null, input.categoryUuid ?? null, input.personId ?? null,
     input.frequency, input.nextRun, input.leadDays ?? 3, input.notify === false ? 0 : 1, t, t],
  );
  return db.getFirstSync<Recurring>('SELECT * FROM recurring WHERE uuid = ?', [uuid])!;
}

export function updateRecurring(id: number, input: Partial<Recurring>): void {
  const db = getDb();
  const t = now();
  const sets: string[] = [];
  const values: SQLiteBindParams = [];
  const allowed = [
    'title', 'amount', 'type', 'accountId', 'accountUuid', 'categoryId', 'categoryUuid',
    'personId', 'frequency', 'nextRun', 'leadDays', 'notify', 'isArchived',
  ] as const;
  for (const k of allowed) {
    if (input[k] !== undefined) {
      sets.push(`${k} = ?`);
      values.push(typeof input[k] === 'boolean' ? (input[k] ? 1 : 0) : (input[k] as never));
    }
  }
  if (sets.length === 0) return;
  sets.push('updatedAt = ?', "syncState = 'pending'");
  values.push(t, id);
  db.runSync(`UPDATE recurring SET ${sets.join(', ')} WHERE id = ?`, values);
}

export function deleteRecurring(id: number): void {
  const t = now();
  getDb().runSync(`UPDATE recurring SET deletedAt = ?, updatedAt = ?, syncState = 'deleted' WHERE id = ?`, [t, t, id]);
}

export function advance(ts: number, freq: Recurring['frequency']): number {
  const d = new Date(ts);
  switch (freq) {
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'biweekly': d.setDate(d.getDate() + 14); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.getTime();
}

/** Próximas N fechas de cobro a partir de `nextRun` (incluida). */
export function nextOccurrences(r: Recurring, count = 3): number[] {
  const out: number[] = [];
  let ts = r.nextRun;
  for (let i = 0; i < count; i++) {
    out.push(ts);
    ts = advance(ts, r.frequency);
  }
  return out;
}

export function daysUntil(ts: number): number {
  const ms = ts - Date.now();
  return Math.ceil(ms / 86400000);
}

/** Genera las transacciones vencidas de las recurrencias. Se llama al arrancar la app. */
export function runDueRecurring(): number {
  const db = getDb();
  const due = db.getAllSync<Recurring>(
    `SELECT * FROM recurring WHERE deletedAt IS NULL AND isArchived = 0 AND nextRun <= ?`,
    [Date.now()],
  );
  let created = 0;
  for (const r of due) {
    let next = r.nextRun;
    let guard = 0;
    while (next <= Date.now() && guard < 120) {
      createTransaction({
        title: r.title,
        amount: r.type === 'expense' ? -Math.abs(r.amount) : Math.abs(r.amount),
        type: r.type,
        accountId: r.accountId,
        accountUuid: r.accountUuid,
        categoryId: r.categoryId,
        categoryUuid: r.categoryUuid,
        date: next,
      });
      created++;
      next = advance(next, r.frequency);
      guard++;
    }
    const t = now();
    db.runSync(`UPDATE recurring SET nextRun = ?, lastRun = ?, updatedAt = ?, syncState = 'pending' WHERE id = ?`, [next, t, t, r.id]);
  }
  return created;
}
