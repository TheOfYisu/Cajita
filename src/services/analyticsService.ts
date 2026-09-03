import { getDb, Transaction } from '../db/database';
import { getAccounts } from './accountService';

export interface PeriodSummary {
  income: number;
  expense: number;
  transfers: number;
  debtPaid: number;
  net: number;
}

export function periodSummary(from: number, to: number): PeriodSummary {
  const db = getDb();
  const row = db.getFirstSync<{ inc: number; exp: number; tr: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS inc,
       COALESCE(SUM(CASE WHEN type='expense' THEN ABS(amount) ELSE 0 END),0) AS exp,
       COALESCE(SUM(CASE WHEN type='transfer' AND amount < 0 THEN ABS(amount) ELSE 0 END),0) AS tr
     FROM transactions WHERE deletedAt IS NULL AND date BETWEEN ? AND ?`,
    [from, to],
  );
  const income = row?.inc ?? 0;
  const expense = row?.exp ?? 0;
  const transfers = row?.tr ?? 0;

  const debtIds = getAccounts(true).filter((a) => ['credit_card', 'debt', 'loan'].includes(a.type)).map((a) => a.id);
  const loanPay = db.getFirstSync<{ s: number }>(
    `SELECT COALESCE(SUM(ABS(amount)),0) AS s FROM transactions
     WHERE deletedAt IS NULL AND type='expense' AND loanId IS NOT NULL AND date BETWEEN ? AND ?`,
    [from, to],
  )?.s ?? 0;
  let cardPay = 0;
  if (debtIds.length) {
    const ph = debtIds.map(() => '?').join(',');
    cardPay = db.getFirstSync<{ s: number }>(
      `SELECT COALESCE(SUM(amount),0) AS s FROM transactions
       WHERE deletedAt IS NULL AND type='transfer' AND amount > 0 AND accountId IN (${ph}) AND date BETWEEN ? AND ?`,
      [...debtIds, from, to],
    )?.s ?? 0;
  }

  return { income, expense, transfers, debtPaid: loanPay + cardPay, net: income - expense };
}

/** Transacciones que cuentan como pago a deudas/créditos en el periodo. */
export function debtPaymentTransactions(from: number, to: number): Transaction[] {
  const db = getDb();
  const debtIds = getAccounts(true).filter((a) => ['credit_card', 'debt', 'loan'].includes(a.type)).map((a) => a.id);
  const debtClause = debtIds.length
    ? ` OR (type='transfer' AND amount > 0 AND accountId IN (${debtIds.map(() => '?').join(',')}))`
    : '';
  const params: (string | number)[] = [from, to];
  if (debtIds.length) params.push(...debtIds);
  return db.getAllSync<Transaction>(
    `SELECT * FROM transactions
     WHERE deletedAt IS NULL AND date BETWEEN ? AND ?
       AND ((type='expense' AND loanId IS NOT NULL)${debtClause})
     ORDER BY date DESC, id DESC LIMIT 500`,
    params,
  );
}

export interface MonthEntry {
  label: string;
  longLabel: string;
  income: number;
  expense: number;
  transfers: number;
  net: number;
  start: number;
  end: number;
}

export function monthlySeriesRange(months: number): MonthEntry[] {
  const out: MonthEntry[] = [];
  const db = getDb();
  const base = new Date();
  base.setDate(1);
  base.setHours(0, 0, 0, 0);
  for (let i = months - 1; i >= 0; i--) {
    const startDate = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const start = startDate.getTime();
    const end = new Date(base.getFullYear(), base.getMonth() - i + 1, 1).getTime() - 1;
    const row = db.getFirstSync<{ inc: number; exp: number; tr: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS inc,
         COALESCE(SUM(CASE WHEN type='expense' THEN ABS(amount) ELSE 0 END),0) AS exp,
         COALESCE(SUM(CASE WHEN type='transfer' AND amount < 0 THEN ABS(amount) ELSE 0 END),0) AS tr
       FROM transactions WHERE deletedAt IS NULL AND date BETWEEN ? AND ?`,
      [start, end],
    );
    const income = row?.inc ?? 0;
    const expense = row?.exp ?? 0;
    out.push({
      label: startDate.toLocaleDateString('es-CO', { month: 'short' }),
      longLabel: startDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
      income,
      expense,
      transfers: row?.tr ?? 0,
      net: income - expense,
      start,
      end,
    });
  }
  return out;
}

/** Serie mes a mes desde la primera transacción hasta hoy (para la vista "Todo"). */
export function fullMonthlySeries(): MonthEntry[] {
  const db = getDb();
  const first = db.getFirstSync<{ d: number }>(
    `SELECT MIN(date) AS d FROM transactions WHERE deletedAt IS NULL`,
  )?.d;
  if (!first) return monthlySeriesRange(1);
  const start = new Date(first);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
  return monthlySeriesRange(Math.min(Math.max(months, 1), 120));
}
