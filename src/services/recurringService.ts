import {
  getDb, Recurring, RecurringKind, RecurringPayment, now, genUuid,
  periodKeyOf, dueDateForPeriod,
} from '../db/database';
import type { SQLiteBindParams } from 'expo-sqlite';
import { createTransaction, deleteTransaction } from './transactionService';
import { getPrefs } from './prefsService';

export const RECURRING_KINDS: { key: RecurringKind; label: string; short: string; icon: string }[] = [
  { key: 'subscription', label: 'Suscripción', short: 'Suscripción', icon: 'repeat' },
  { key: 'service', label: 'Servicio de casa', short: 'Servicio', icon: 'home' },
  { key: 'fixed', label: 'Otro gasto fijo', short: 'Gasto fijo', icon: 'calendar' },
];

export function kindLabel(k: RecurringKind): string {
  return RECURRING_KINDS.find((x) => x.key === k)?.label ?? k;
}

/** Los gastos fijos/servicios se confirman con checklist mensual, no se autogeneran. */
export const CHECKLIST_KINDS: RecurringKind[] = ['service', 'fixed'];
export function isChecklistKind(k: RecurringKind): boolean {
  return CHECKLIST_KINDS.includes(k);
}

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
  kind?: RecurringKind;
  variableAmount?: boolean;
  dueDay?: number | null;
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
       (uuid, title, amount, type, kind, variableAmount, dueDay, accountId, accountUuid,
        categoryId, categoryUuid, personId,
        frequency, nextRun, leadDays, notify, isArchived, createdAt, updatedAt, syncState)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending')`,
    [uuid, input.title, Math.abs(input.amount), input.type, input.kind ?? 'subscription',
     input.variableAmount ? 1 : 0, input.dueDay ?? null,
     input.accountId, input.accountUuid,
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
    'title', 'amount', 'type', 'kind', 'variableAmount', 'dueDay',
    'accountId', 'accountUuid', 'categoryId', 'categoryUuid',
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

/**
 * Genera las transacciones vencidas de las suscripciones (kind='subscription').
 * Los gastos fijos / servicios NO se autogeneran: se confirman con el checklist mensual.
 * Se llama al arrancar la app.
 */
export function runDueRecurring(): number {
  const db = getDb();
  const due = db.getAllSync<Recurring>(
    `SELECT * FROM recurring
     WHERE deletedAt IS NULL AND isArchived = 0 AND kind = 'subscription' AND nextRun <= ?`,
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

// ─────────────────────────────────────────────────────────────────────────────
// Gastos fijos / servicios: checklist mensual
// ─────────────────────────────────────────────────────────────────────────────

export type FixedStatus = 'pending' | 'paid' | 'skipped' | 'overdue';

export interface FixedItem {
  recurring: Recurring;
  payment: RecurringPayment;
  status: FixedStatus;
  /** Monto de referencia: el real si está pagado, si no el estimado. */
  displayAmount: number;
}

export function getFixedRecurring(includeArchived = false): Recurring[] {
  const q = includeArchived
    ? `SELECT * FROM recurring WHERE deletedAt IS NULL AND kind IN ('service','fixed') ORDER BY dueDay, title`
    : `SELECT * FROM recurring WHERE deletedAt IS NULL AND isArchived = 0 AND kind IN ('service','fixed') ORDER BY dueDay, title`;
  return getDb().getAllSync<Recurring>(q);
}

export function getSubscriptions(includeArchived = false): Recurring[] {
  const q = includeArchived
    ? `SELECT * FROM recurring WHERE deletedAt IS NULL AND kind = 'subscription' ORDER BY nextRun`
    : `SELECT * FROM recurring WHERE deletedAt IS NULL AND isArchived = 0 AND kind = 'subscription' ORDER BY nextRun`;
  return getDb().getAllSync<Recurring>(q);
}

/** Crea (si falta) la fila de pago del periodo actual para un gasto fijo y la devuelve. */
function ensurePayment(r: Recurring, periodKey: string, monthStartDay: number): RecurringPayment {
  const db = getDb();
  const existing = db.getFirstSync<RecurringPayment>(
    `SELECT * FROM recurring_payments WHERE recurringId = ? AND periodKey = ? AND deletedAt IS NULL`,
    [r.id, periodKey],
  );
  if (existing) return existing;
  const t = now();
  const uuid = genUuid();
  const dueDate = dueDateForPeriod(periodKey, r.dueDay ?? 1, monthStartDay);
  db.runSync(
    `INSERT INTO recurring_payments
       (uuid, recurringId, recurringUuid, periodKey, dueDate, skipped, createdAt, updatedAt, syncState)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'pending')
     ON CONFLICT(recurringId, periodKey) DO NOTHING`,
    [uuid, r.id, r.uuid, periodKey, dueDate, t, t],
  );
  return db.getFirstSync<RecurringPayment>(
    `SELECT * FROM recurring_payments WHERE recurringId = ? AND periodKey = ? AND deletedAt IS NULL`,
    [r.id, periodKey],
  )!;
}

function statusOf(p: RecurringPayment): FixedStatus {
  if (p.skipped) return 'skipped';
  if (p.paidAt) return 'paid';
  if (p.dueDate < Date.now()) return 'overdue';
  return 'pending';
}

/** Lista de gastos fijos del mes contable indicado (por defecto, el actual). */
export function getFixedForMonth(periodKey?: string): FixedItem[] {
  const monthStartDay = getPrefs().monthStartDay;
  const key = periodKey ?? periodKeyOf(Date.now(), monthStartDay);
  const items = getFixedRecurring(false);
  return items.map((r) => {
    const payment = ensurePayment(r, key, monthStartDay);
    const status = statusOf(payment);
    const displayAmount = status === 'paid' && payment.amount != null ? payment.amount : Math.abs(r.amount);
    return { recurring: r, payment, status, displayAmount };
  }).sort((a, b) => a.payment.dueDate - b.payment.dueDate);
}

export function getPaymentById(id: number): RecurringPayment | null {
  return getDb().getFirstSync<RecurringPayment>(
    `SELECT * FROM recurring_payments WHERE id = ? AND deletedAt IS NULL`, [id],
  );
}

export function markFixedPaid(input: {
  paymentId: number;
  amount: number;
  accountId: number;
  accountUuid: string;
  categoryId?: number | null;
  categoryUuid?: string | null;
  date?: number;
  title?: string;
}): void {
  const db = getDb();
  const p = getPaymentById(input.paymentId);
  if (!p) return;
  const r = getRecurringById(p.recurringId);
  if (!r) return;
  // Si ya estaba pagado, revierte la transacción anterior antes de recrearla.
  if (p.transactionId) {
    try { deleteTransaction(p.transactionId); } catch { /* noop */ }
  }
  const amt = Math.abs(input.amount);
  const tx = createTransaction({
    title: input.title?.trim() || r.title,
    amount: -amt,
    type: 'expense',
    accountId: input.accountId,
    accountUuid: input.accountUuid,
    categoryId: input.categoryId ?? r.categoryId ?? null,
    categoryUuid: input.categoryUuid ?? r.categoryUuid ?? null,
    date: input.date ?? Date.now(),
  });
  const t = now();
  db.runSync(
    `UPDATE recurring_payments
     SET paidAt = ?, amount = ?, transactionId = ?, transactionUuid = ?, skipped = 0, updatedAt = ?, syncState = 'pending'
     WHERE id = ?`,
    [input.date ?? t, amt, tx.id, tx.uuid, t, input.paymentId],
  );
}

export function undoFixedPayment(paymentId: number): void {
  const db = getDb();
  const p = getPaymentById(paymentId);
  if (!p) return;
  if (p.transactionId) {
    try { deleteTransaction(p.transactionId); } catch { /* noop */ }
  }
  const t = now();
  db.runSync(
    `UPDATE recurring_payments
     SET paidAt = NULL, amount = NULL, transactionId = NULL, transactionUuid = NULL, updatedAt = ?, syncState = 'pending'
     WHERE id = ?`,
    [t, paymentId],
  );
}

export function setFixedSkipped(paymentId: number, skipped: boolean): void {
  const db = getDb();
  const p = getPaymentById(paymentId);
  if (!p) return;
  if (skipped && p.transactionId) {
    try { deleteTransaction(p.transactionId); } catch { /* noop */ }
  }
  const t = now();
  db.runSync(
    `UPDATE recurring_payments
     SET skipped = ?, ${skipped ? 'paidAt = NULL, amount = NULL, transactionId = NULL, transactionUuid = NULL,' : ''} updatedAt = ?, syncState = 'pending'
     WHERE id = ?`,
    [skipped ? 1 : 0, t, paymentId],
  );
}

export interface FixedMonthlySummary {
  periodKey: string;
  items: FixedItem[];
  total: number;        // estimado mensual de todos los gastos fijos activos
  paidTotal: number;    // suma pagada este mes
  pendingTotal: number; // suma estimada de lo que falta (pendiente + vencido)
  paidCount: number;
  pendingCount: number;  // incluye vencidos, excluye omitidos
  overdueCount: number;
}

export function fixedMonthlySummary(periodKey?: string): FixedMonthlySummary {
  const monthStartDay = getPrefs().monthStartDay;
  const key = periodKey ?? periodKeyOf(Date.now(), monthStartDay);
  const items = getFixedForMonth(key);
  let total = 0, paidTotal = 0, pendingTotal = 0, paidCount = 0, pendingCount = 0, overdueCount = 0;
  for (const it of items) {
    total += Math.abs(it.recurring.amount);
    if (it.status === 'paid') {
      paidTotal += it.payment.amount ?? 0;
      paidCount++;
    } else if (it.status === 'skipped') {
      /* no cuenta */
    } else {
      pendingTotal += Math.abs(it.recurring.amount);
      pendingCount++;
      if (it.status === 'overdue') overdueCount++;
    }
  }
  return { periodKey: key, items, total, paidTotal, pendingTotal, paidCount, pendingCount, overdueCount };
}

/** Estima el día 1 del mes para nextRun a partir de dueDay (para avisos y orden). */
export function nextRunFromDueDay(dueDay: number): number {
  const monthStartDay = getPrefs().monthStartDay;
  const key = periodKeyOf(Date.now(), monthStartDay);
  let due = dueDateForPeriod(key, dueDay, monthStartDay);
  if (due < Date.now()) {
    // siguiente periodo
    const [y, m] = key.split('-').map(Number);
    const nextKey = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`;
    due = dueDateForPeriod(nextKey, dueDay, monthStartDay);
  }
  return due;
}
