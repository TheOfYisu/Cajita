import { getDb, Transaction, now, genUuid } from '../db/database';
import type { SQLiteBindParams } from 'expo-sqlite';

export interface CreateTransactionInput {
  title: string;
  notes?: string;
  amount: number;
  type: Transaction['type'];
  accountId: number;
  accountUuid: string;
  toAccountId?: number | null;
  toAccountUuid?: string | null;
  categoryId?: number | null;
  categoryUuid?: string | null;
  loanId?: number | null;
  loanUuid?: string | null;
  date?: number;
}

export function createTransaction(input: CreateTransactionInput): Transaction {
  const database = getDb();
  const t = now();
  const date = input.date ?? t;
  const uuid = genUuid();
  database.runSync(
    `INSERT INTO transactions (uuid, title, notes, amount, type, accountId, accountUuid,
       toAccountId, toAccountUuid, categoryId, categoryUuid, loanId, loanUuid, date,
       createdAt, updatedAt, syncState)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [uuid, input.title, input.notes ?? '', input.amount, input.type, input.accountId, input.accountUuid,
     input.toAccountId ?? null, input.toAccountUuid ?? null,
     input.categoryId ?? null, input.categoryUuid ?? null,
     input.loanId ?? null, input.loanUuid ?? null, date, t, t],
  );
  const row = database.getFirstSync<Transaction>('SELECT * FROM transactions WHERE uuid = ?', [uuid]);
  return row!;
}

/**
 * Transferencia entre dos cuentas. Crea 2 transacciones (transfer out / transfer in).
 * Si la cuenta destino es una tarjeta de crédito, esto REDUCE su deuda.
 * No cuenta como gasto ni ingreso.
 */
export function createTransfer(input: {
  title: string;
  amount: number;
  fromAccountId: number;
  fromAccountUuid: string;
  toAccountId: number;
  toAccountUuid: string;
  date?: number;
}): [Transaction, Transaction] {
  const out = createTransaction({
    title: input.title,
    amount: -Math.abs(input.amount),
    type: 'transfer',
    accountId: input.fromAccountId,
    accountUuid: input.fromAccountUuid,
    toAccountId: input.toAccountId,
    toAccountUuid: input.toAccountUuid,
    date: input.date,
  });
  const inTx = createTransaction({
    title: input.title,
    amount: Math.abs(input.amount),
    type: 'transfer',
    accountId: input.toAccountId,
    accountUuid: input.toAccountUuid,
    toAccountId: input.fromAccountId,
    toAccountUuid: input.fromAccountUuid,
    date: input.date,
  });
  return [out, inTx];
}

/**
 * Transferencia externa: dinero que sale de una de tus cuentas hacia fuera de la app
 * (otro banco, otra persona, tu bróker…). Un solo movimiento tipo 'transfer' con
 * `toAccountId` nulo. No cuenta como gasto ni ingreso.
 */
export function createExternalTransfer(input: {
  title: string;
  notes?: string;
  amount: number;
  fromAccountId: number;
  fromAccountUuid: string;
  direction?: 'out' | 'in';
  date?: number;
}): Transaction {
  const sign = input.direction === 'in' ? 1 : -1;
  return createTransaction({
    title: input.title,
    notes: input.notes,
    amount: sign * Math.abs(input.amount),
    type: 'transfer',
    accountId: input.fromAccountId,
    accountUuid: input.fromAccountUuid,
    toAccountId: null,
    toAccountUuid: null,
    date: input.date,
  });
}

/**
 * Pago de tarjeta de crédito o cuota de préstamo.
 * Es una transferencia desde la cuenta de fondos hacia la tarjeta/préstamo,
 * lo que reduce la deuda sin contarlo como gasto.
 */
export function payCreditCard(input: {
  amount: number;
  fromAccountId: number;
  fromAccountUuid: string;
  toAccountId: number;
  toAccountUuid: string;
  date?: number;
}): [Transaction, Transaction] {
  return createTransfer({ title: 'Pago Tarjeta de Crédito', ...input });
}

export function getTransactions(options?: {
  accountId?: number;
  limit?: number;
  offset?: number;
}): Transaction[] {
  const database = getDb();
  let q = `SELECT * FROM transactions WHERE deletedAt IS NULL`;
  const params: SQLiteBindParams = [];
  if (options?.accountId != null) {
    q += ` AND (accountId = ? OR toAccountId = ?)`;
    params.push(options.accountId, options.accountId);
  }
  q += ` ORDER BY date DESC`;
  if (options?.limit != null) {
    q += ` LIMIT ? OFFSET ?`;
    params.push(options.limit, options.offset ?? 0);
  }
  return database.getAllSync<Transaction>(q, params);
}

export interface TxFilter {
  text?: string;
  accountId?: number | null;
  categoryId?: number | null;
  type?: Transaction['type'] | null;
  from?: number | null;
  to?: number | null;
  limit?: number;
}

export function searchTransactions(f: TxFilter): Transaction[] {
  const database = getDb();
  let q = `SELECT * FROM transactions WHERE deletedAt IS NULL`;
  const params: SQLiteBindParams = [];
  if (f.text && f.text.trim()) {
    q += ` AND (title LIKE ? OR notes LIKE ?)`;
    const like = `%${f.text.trim()}%`;
    params.push(like, like);
  }
  if (f.accountId != null) {
    q += ` AND (accountId = ? OR toAccountId = ?)`;
    params.push(f.accountId, f.accountId);
  }
  if (f.categoryId != null) {
    q += ` AND categoryId = ?`;
    params.push(f.categoryId);
  }
  if (f.type) {
    q += ` AND type = ?`;
    params.push(f.type);
  }
  if (f.from != null) {
    q += ` AND date >= ?`;
    params.push(f.from);
  }
  if (f.to != null) {
    q += ` AND date <= ?`;
    params.push(f.to);
  }
  q += ` ORDER BY date DESC LIMIT ?`;
  params.push(f.limit ?? 500);
  return database.getAllSync<Transaction>(q, params);
}

function buildFilterClause(f: TxFilter): { where: string; params: (string | number)[] } {
  let where = ` WHERE deletedAt IS NULL`;
  const params: (string | number)[] = [];
  if (f.text && f.text.trim()) {
    where += ` AND (title LIKE ? OR notes LIKE ?)`;
    const like = `%${f.text.trim()}%`;
    params.push(like, like);
  }
  if (f.accountId != null) { where += ` AND (accountId = ? OR toAccountId = ?)`; params.push(f.accountId, f.accountId); }
  if (f.categoryId != null) { where += ` AND categoryId = ?`; params.push(f.categoryId); }
  if (f.type) { where += ` AND type = ?`; params.push(f.type); }
  if (f.from != null) { where += ` AND date >= ?`; params.push(f.from); }
  if (f.to != null) { where += ` AND date <= ?`; params.push(f.to); }
  return { where, params };
}

export function pageTransactions(f: TxFilter & { limit: number; offset: number }): Transaction[] {
  const { where, params } = buildFilterClause(f);
  return getDb().getAllSync<Transaction>(
    `SELECT * FROM transactions${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, f.limit, f.offset],
  );
}

export function transactionStats(f: TxFilter): { count: number; income: number; expense: number } {
  const { where, params } = buildFilterClause(f);
  const row = getDb().getFirstSync<{ c: number; inc: number; exp: number }>(
    `SELECT COUNT(*) AS c,
            COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS inc,
            COALESCE(SUM(CASE WHEN type='expense' THEN ABS(amount) ELSE 0 END),0) AS exp
     FROM transactions${where}`,
    params,
  );
  return { count: row?.c ?? 0, income: row?.inc ?? 0, expense: row?.exp ?? 0 };
}

function csvCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function exportTransactionsCsv(): string {
  const database = getDb();
  const rows = database.getAllSync<Transaction & { accountName: string; categoryName: string | null }>(
    `SELECT t.*, a.name AS accountName, c.name AS categoryName
     FROM transactions t
     LEFT JOIN accounts a ON a.id = t.accountId
     LEFT JOIN categories c ON c.id = t.categoryId
     WHERE t.deletedAt IS NULL ORDER BY t.date DESC`,
  );
  const header = 'flow_title,flow_notes,flow_account_name,flow_amount,flow_date_of_transaction,flow_category_optional,flow_type';
  const lines = rows.map((r) => {
    const date = new Date(r.date).toISOString().slice(0, 10);
    return [
      csvCell(r.title),
      csvCell(r.notes),
      csvCell(r.accountName ?? ''),
      String(r.amount),
      date,
      csvCell(r.categoryName ?? ''),
      r.type,
    ].join(',');
  });
  return [header, ...lines].join('\n');
}

export function getTransaction(id: number): Transaction | null {
  const database = getDb();
  return database.getFirstSync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
}

export function updateTransaction(id: number, input: Partial<Transaction>): void {
  const database = getDb();
  const t = now();
  const sets: string[] = [];
  const values: SQLiteBindParams = [];
  const allowed = ['title', 'notes', 'amount', 'type', 'accountId', 'accountUuid', 'categoryId', 'categoryUuid', 'loanId', 'loanUuid', 'date'] as const;
  for (const k of allowed) {
    if (input[k] !== undefined) {
      sets.push(`${k} = ?`);
      values.push(input[k]);
    }
  }
  sets.push('updatedAt = ?', 'syncState = ?');
  values.push(t, 'pending', id);
  database.runSync(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`, values);
}

export function deleteTransaction(id: number): void {
  const database = getDb();
  const t = now();
  database.runSync(
    `UPDATE transactions SET deletedAt = ?, updatedAt = ?, syncState = 'deleted' WHERE id = ?`,
    [t, t, id],
  );
}

/**
 * Balance correction: ajusta el saldo de una cuenta sin contar como gasto/ingreso.
 * Útil para saldo inicial o ajustes.
 */
export function balanceCorrection(input: {
  accountId: number;
  accountUuid: string;
  amount: number;
  title?: string;
  date?: number;
}): Transaction {
  return createTransaction({
    title: input.title ?? 'Balance Correction',
    amount: input.amount,
    type: 'balance_correction',
    accountId: input.accountId,
    accountUuid: input.accountUuid,
    date: input.date,
  });
}

export interface MonthlyTotals {
  income: number;
  expense: number;
  net: number;
}

export function totalsBetween(from: number, to: number): MonthlyTotals {
  const database = getDb();
  const row = database.getFirstSync<{ inc: number; exp: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS inc,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END), 0) AS exp
     FROM transactions WHERE deletedAt IS NULL AND date BETWEEN ? AND ?`,
    [from, to],
  );
  const inc = row?.inc ?? 0;
  const exp = row?.exp ?? 0;
  return { income: inc, expense: exp, net: inc - exp };
}