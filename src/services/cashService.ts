import { getDb, CashWithdrawal, now, genUuid, monthRange, Transaction } from '../db/database';
import type { SQLiteBindParams } from 'expo-sqlite';
import { createTransfer, deleteTransaction } from './transactionService';
import { getPrefs } from './prefsService';

export interface WithdrawalView extends CashWithdrawal {
  spent: number;
  remaining: number;
  windowEnd: number; // exclusivo; Infinity si es el retiro más reciente de la cuenta
}

export function getWithdrawals(includeClosed = true): CashWithdrawal[] {
  const q = includeClosed
    ? `SELECT * FROM cash_withdrawals WHERE deletedAt IS NULL ORDER BY date DESC, id DESC`
    : `SELECT * FROM cash_withdrawals WHERE deletedAt IS NULL AND closedAt IS NULL ORDER BY date DESC, id DESC`;
  return getDb().getAllSync<CashWithdrawal>(q);
}

export function getWithdrawalById(id: number): CashWithdrawal | null {
  return getDb().getFirstSync<CashWithdrawal>(
    `SELECT * FROM cash_withdrawals WHERE id = ? AND deletedAt IS NULL`, [id],
  );
}

/** Fin de la ventana de un retiro: la fecha del siguiente retiro en la misma cuenta, o Infinity. */
function windowEndFor(w: CashWithdrawal): number {
  const next = getDb().getFirstSync<{ d: number }>(
    `SELECT MIN(date) AS d FROM cash_withdrawals
     WHERE deletedAt IS NULL AND accountId = ? AND id != ? AND date >= ?
       AND (date > ? OR (date = ? AND id > ?))`,
    [w.accountId, w.id, w.date, w.date, w.date, w.id],
  )?.d;
  return next ?? Number.POSITIVE_INFINITY;
}

/** Gasto en efectivo imputado a un retiro: gastos de esa cuenta dentro de su ventana. */
export function withdrawalSpent(w: CashWithdrawal): number {
  const end = windowEndFor(w);
  const to = end === Number.POSITIVE_INFINITY ? Number.MAX_SAFE_INTEGER : end - 1;
  const row = getDb().getFirstSync<{ s: number }>(
    `SELECT COALESCE(SUM(ABS(amount)), 0) AS s FROM transactions
     WHERE deletedAt IS NULL AND type = 'expense' AND accountId = ? AND date BETWEEN ? AND ?`,
    [w.accountId, w.date, to],
  );
  return row?.s ?? 0;
}

export function withdrawalExpenses(w: CashWithdrawal): Transaction[] {
  const end = windowEndFor(w);
  const to = end === Number.POSITIVE_INFINITY ? Number.MAX_SAFE_INTEGER : end - 1;
  return getDb().getAllSync<Transaction>(
    `SELECT * FROM transactions
     WHERE deletedAt IS NULL AND type = 'expense' AND accountId = ? AND date BETWEEN ? AND ?
     ORDER BY date DESC, id DESC`,
    [w.accountId, w.date, to],
  );
}

export function toView(w: CashWithdrawal): WithdrawalView {
  const spent = withdrawalSpent(w);
  return { ...w, spent, remaining: w.amount - spent, windowEnd: windowEndFor(w) };
}

/** Retiros activos (no cerrados y aún "abiertos": son el más reciente de su cuenta). */
export function activeWithdrawals(): WithdrawalView[] {
  return getWithdrawals(false)
    .map(toView)
    .filter((w) => w.windowEnd === Number.POSITIVE_INFINITY);
}

export function allWithdrawalViews(): WithdrawalView[] {
  return getWithdrawals(true).map(toView);
}

export interface CreateWithdrawalInput {
  amount: number;
  accountId: number;      // cuenta efectivo destino
  accountUuid: string;
  fromAccountId?: number | null;
  fromAccountUuid?: string | null;
  date?: number;
  note?: string;
}

export function createWithdrawal(input: CreateWithdrawalInput): CashWithdrawal {
  const db = getDb();
  const t = now();
  const uuid = genUuid();
  const date = input.date ?? t;
  const amt = Math.abs(input.amount);
  let transactionId: number | null = null;
  let transactionUuid: string | null = null;

  if (input.fromAccountId && input.fromAccountUuid) {
    const [out] = createTransfer({
      title: input.note?.trim() || 'Retiro en efectivo',
      amount: amt,
      fromAccountId: input.fromAccountId,
      fromAccountUuid: input.fromAccountUuid,
      toAccountId: input.accountId,
      toAccountUuid: input.accountUuid,
      date,
    });
    transactionId = out.id;
    transactionUuid = out.uuid;
  }

  db.runSync(
    `INSERT INTO cash_withdrawals
       (uuid, amount, accountId, accountUuid, fromAccountId, fromAccountUuid, date, note,
        transactionId, transactionUuid, createdAt, updatedAt, syncState)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [uuid, amt, input.accountId, input.accountUuid, input.fromAccountId ?? null,
     input.fromAccountUuid ?? null, date, input.note?.trim() ?? '',
     transactionId, transactionUuid, t, t],
  );
  return db.getFirstSync<CashWithdrawal>('SELECT * FROM cash_withdrawals WHERE uuid = ?', [uuid])!;
}

export function updateWithdrawal(id: number, patch: Partial<Pick<CashWithdrawal, 'amount' | 'note' | 'date'>>): void {
  const db = getDb();
  const t = now();
  const sets: string[] = [];
  const values: SQLiteBindParams = [];
  if (patch.amount !== undefined) { sets.push('amount = ?'); values.push(Math.abs(patch.amount)); }
  if (patch.note !== undefined) { sets.push('note = ?'); values.push(patch.note); }
  if (patch.date !== undefined) { sets.push('date = ?'); values.push(patch.date); }
  if (sets.length === 0) return;
  sets.push('updatedAt = ?', "syncState = 'pending'");
  values.push(t, id);
  db.runSync(`UPDATE cash_withdrawals SET ${sets.join(', ')} WHERE id = ?`, values);
}

export function closeWithdrawal(id: number, closed = true): void {
  const t = now();
  getDb().runSync(
    `UPDATE cash_withdrawals SET closedAt = ?, updatedAt = ?, syncState = 'pending' WHERE id = ?`,
    [closed ? t : null, t, id],
  );
}

export function deleteWithdrawal(id: number, removeTransfer = true): void {
  const db = getDb();
  const w = getWithdrawalById(id);
  if (!w) return;
  if (removeTransfer && w.transactionId) {
    // Borra el par de transferencia (out + in enlazadas por cuentas y fecha).
    try {
      deleteTransaction(w.transactionId);
      const inTx = db.getFirstSync<{ id: number }>(
        `SELECT id FROM transactions
         WHERE deletedAt IS NULL AND type = 'transfer' AND amount > 0
           AND accountId = ? AND toAccountId = ? AND date = ?
         ORDER BY id DESC LIMIT 1`,
        [w.accountId, w.fromAccountId ?? -1, w.date],
      );
      if (inTx) deleteTransaction(inTx.id);
    } catch { /* noop */ }
  }
  const t = now();
  db.runSync(
    `UPDATE cash_withdrawals SET deletedAt = ?, updatedAt = ?, syncState = 'deleted' WHERE id = ?`,
    [t, t, id],
  );
}

/** Sobrante de los retiros cuya ventana terminó dentro del mes pasado. */
export function lastMonthLeftover(): number {
  const monthStartDay = getPrefs().monthStartDay;
  const thisMonth = monthRange(monthStartDay);
  const prevRef = thisMonth.from - 1;
  const prev = monthRange(monthStartDay, prevRef);
  let leftover = 0;
  for (const w of getWithdrawals(true)) {
    const end = windowEndFor(w);
    const effEnd = end === Number.POSITIVE_INFINITY ? (w.closedAt ?? Number.POSITIVE_INFINITY) : end;
    if (effEnd >= prev.from && effEnd <= prev.to) {
      leftover += w.amount - withdrawalSpent(w);
    }
  }
  return leftover;
}
