import { getDb } from '../db/database';
import { ensureCategory } from './categoryService';
import { createAccount, getAccounts } from './accountService';
import { balanceCorrection, createTransaction, createTransfer } from './transactionService';
import { createLoan, getLoans } from './loanService';

export interface CsvImportResult {
  imported: number;
  skipped: number;
  accountsCreated: string[];
  errors: string[];
}

export interface CsvPreview {
  rows: Row[];
  total: number;
  income: number;
  expense: number;
  newAccounts: string[];
  newCategories: string[];
}

export interface Row {
  title: string;
  notes: string;
  accountName: string;
  accountType: string;
  accountCreditLimit: number | null;
  transferTo: string;
  transferToType: string;
  amount: number;
  date: string;
  category: string;
  loanName: string;
}

const TYPE_ALIASES: Record<string, string> = {
  bank: 'bank',
  banco: 'bank',
  cash: 'cash',
  efectivo: 'cash',
  savings: 'savings',
  ahorro: 'savings',
  cajita: 'cajita',
  'tarjeta': 'credit_card',
  'credit_card': 'credit_card',
  'credit card': 'credit_card',
  tarjeta_credito: 'credit_card',
  'tc': 'credit_card',
  cdt: 'cdt',
  debt: 'debt',
  deuda: 'debt',
  loan: 'loan',
  prestamo: 'loan',
  'préstamo': 'loan',
};

export function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase();
  const keys = {
    title: ['flow_title', 'title'],
    notes: ['flow_notes', 'notes'],
    account: ['flow_account_name', 'account'],
    type: ['flow_account_type', 'account_type', 'type'],
    creditLimit: ['flow_account_credit_limit', 'credit_limit', 'cupo'],
    transferTo: ['flow_transfer_to', 'transfer_to', 'to_account'],
    transferToType: ['flow_transfer_to_type', 'to_account_type'],
    amount: ['flow_amount', 'amount'],
    date: ['flow_date_of_transaction', 'transaction date', 'date'],
    category: ['flow_category_optional', 'category'],
    loan: ['flow_loan', 'loan', 'prestamo'],
  };
  const idx: Record<string, number> = {};
  for (const k of Object.keys(keys)) idx[k] = -1;
  const parts = header.split(',');
  for (let i = 0; i < parts.length; i++) {
    const h = parts[i].trim().toLowerCase();
    for (const k of Object.keys(keys)) {
      if (idx[k] === -1 && (keys as Record<string, string[]>)[k].includes(h)) idx[k] = i;
    }
  }

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCsvLine(line);
    const get = (k: string) => (idx[k] >= 0 && idx[k] < cols.length ? cols[idx[k]].trim() : '');
    const amount = parseAmount(get('amount'));
    if (amount == null) continue;
    const rawType = get('type');
    const accountType = TYPE_ALIASES[rawType.toLowerCase()] ?? 'bank';
    const rawToType = get('transferToType');
    const transferToType = rawToType ? TYPE_ALIASES[rawToType.toLowerCase()] ?? 'credit_card' : 'credit_card';
    rows.push({
      title: get('title'),
      notes: get('notes'),
      accountName: get('account'),
      accountType,
      accountCreditLimit: get('creditLimit') ? parseAmount(get('creditLimit')) : null,
      transferTo: get('transferTo'),
      transferToType,
      amount,
      date: get('date'),
      category: get('category'),
      loanName: get('loan'),
    });
  }
  return rows;
}

function pick(header: string, keys: string[]): number {
  const parts = header.split(',');
  for (let i = 0; i < parts.length; i++) {
    const h = parts[i].trim().toLowerCase();
    for (const k of keys) {
      if (h === k) return i;
    }
  }
  return -1;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseAmount(s: string): number | null {
  if (!s) return null;
  let t = s.replace(/[$COP\s\u00a0]/g, '');
  t = t.replace(/[^\d.\-+]/g, '');
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : null;
}

export function previewCsv(text: string): CsvPreview {
  const rows = parseCsv(text);
  const existingAccounts = new Set(getAccounts(true).map((a) => a.name.toLowerCase()));
  const existingCats = new Set(
    getDb()
      .getAllSync<{ name: string }>('SELECT name FROM categories WHERE deletedAt IS NULL')
      .map((c) => c.name.toLowerCase()),
  );
  const newAccounts = new Set<string>();
  const newCategories = new Set<string>();
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.accountName && !existingAccounts.has(r.accountName.toLowerCase())) newAccounts.add(r.accountName);
    if (r.transferTo && !existingAccounts.has(r.transferTo.toLowerCase())) newAccounts.add(r.transferTo);
    if (r.category && !existingCats.has(r.category.toLowerCase())) newCategories.add(r.category);
    if (r.amount >= 0) income += r.amount;
    else expense += r.amount;
  }
  return {
    rows,
    total: rows.length,
    income,
    expense,
    newAccounts: [...newAccounts],
    newCategories: [...newCategories],
  };
}

const BALANCE_TITLES = ['balance inicial', 'saldo inicial', 'balance correction', 'balance'];

/** Borra todos los datos actuales para una importación limpia (reemplazo total). */
export function clearAllData(): void {
  const database = getDb();
  database.execSync(`
    DELETE FROM recurring_payments;
    DELETE FROM cash_withdrawals;
    DELETE FROM transactions;
    DELETE FROM budgets;
    DELETE FROM recurring;
    DELETE FROM loans;
    DELETE FROM people;
    DELETE FROM accounts;
    DELETE FROM categories;
    DELETE FROM sync_metadata;
  `);
  // Reiniciar secuencias autoincrementales para ids limpios
  database.execSync(`
    DELETE FROM sqlite_sequence WHERE name IN
      ('transactions','budgets','recurring','recurring_payments','cash_withdrawals',
       'loans','people','accounts','categories','sync_metadata');
  `);
}

export type ImportMode = 'replace' | 'merge';

export function importCsv(text: string, mode: ImportMode = 'merge'): CsvImportResult {
  const rows = parseCsv(text);
  const database = getDb();
  const result: CsvImportResult = { imported: 0, skipped: 0, accountsCreated: [], errors: [] };
  // En modo 'replace' se borra todo lo existente y el CSV queda como fuente única;
  // en modo 'merge' se suma a lo que ya hay.
  if (mode === 'replace') clearAllData();
  const accountCache = new Map<string, { id: number; uuid: string }>();
  const allAccounts = getAccounts(true);
  for (const a of allAccounts) accountCache.set(a.name.toLowerCase(), { id: a.id, uuid: a.uuid });

  const ensureAccount = (name: string, type: string, creditLimit: number | null) => {
    const key = (name || 'Importado').toLowerCase();
    let acct = accountCache.get(key);
    if (!acct) {
      const a = createAccount({ name, type: type as never, creditLimit });
      result.accountsCreated.push(a.name);
      acct = { id: a.id, uuid: a.uuid };
      accountCache.set(key, acct);
    }
    return acct;
  };

  // Índice de préstamos por nombre
  const loanCache = new Map<string, { id: number; uuid: string }>();
  for (const l of getLoans(true)) loanCache.set(l.name.toLowerCase(), { id: l.id, uuid: l.uuid });

  for (const row of rows) {
    try {
      const acct = ensureAccount(row.accountName || 'Importado', row.accountType, row.accountCreditLimit);
      const isIncome = row.amount >= 0;
      const cat = row.category
        ? ensureCategory({ name: row.category, type: isIncome ? 'income' : 'expense' })
        : null;
      const date = parseDate(row.date);
      const title = row.title || row.category || (isIncome ? 'Ingreso' : 'Gasto');
      const label = (row.title || row.category || '').toLowerCase();

      // 1) Transferencia entre cuentas (pago de tarjeta / movimiento interno)
      if (row.transferTo) {
        const to = ensureAccount(row.transferTo, row.transferToType, null);
        createTransfer({
          title,
          amount: Math.abs(row.amount),
          fromAccountId: acct.id,
          fromAccountUuid: acct.uuid,
          toAccountId: to.id,
          toAccountUuid: to.uuid,
          date,
        });
        result.imported += 2;
        continue;
      }

      // 2) Balance inicial
      if (BALANCE_TITLES.some((b) => label.includes(b))) {
        balanceCorrection({ accountId: acct.id, accountUuid: acct.uuid, amount: row.amount, title, date });
        result.imported++;
        continue;
      }

      // 3) Pago de préstamo (cuota): gasto asociado al préstamo (reduce deuda)
      if (row.loanName) {
        let loan = loanCache.get(row.loanName.toLowerCase());
        if (!loan) {
          const l = createLoan({ name: row.loanName, type: 'borrowed', total: 0, startDate: date });
          loan = { id: l.id, uuid: l.uuid };
          loanCache.set(row.loanName.toLowerCase(), loan);
        }
        createTransaction({
          title,
          notes: row.notes,
          amount: row.amount,
          type: isIncome ? 'income' : 'expense',
          accountId: acct.id,
          accountUuid: acct.uuid,
          categoryId: cat?.id ?? null,
          categoryUuid: cat?.uuid ?? null,
          loanId: loan.id,
          loanUuid: loan.uuid,
          date,
        });
        result.imported++;
        continue;
      }

      // 4) Gasto / ingreso normal
      createTransaction({
        title,
        notes: row.notes,
        amount: row.amount,
        type: isIncome ? 'income' : 'expense',
        accountId: acct.id,
        accountUuid: acct.uuid,
        categoryId: cat?.id ?? null,
        categoryUuid: cat?.uuid ?? null,
        date,
      });
      result.imported++;
    } catch (e) {
      result.errors.push(String(e));
      result.skipped++;
    }
  }
  return result;
}

function parseDate(s: string): number {
  const m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)).getTime();
  }
  const m2 = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m2) {
    return new Date(parseInt(m2[3], 10), parseInt(m2[2], 10) - 1, parseInt(m2[1], 10)).getTime();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
}