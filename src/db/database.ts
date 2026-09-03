import * as SQLite from 'expo-sqlite';

export interface Account {
  id: number;
  uuid: string;
  name: string;
  type: 'bank' | 'cash' | 'credit_card' | 'savings' | 'cajita' | 'cdt' | 'debt' | 'loan';
  currency: string;
  creditLimit: number | null;
  color: string;
  icon: string;
  isPrimary: boolean;
  maturityDate: number | null;
  expectedYield: number | null;
  linkedAccountId: number | null;
  excludeFromTotals: boolean;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  syncState: 'synced' | 'pending' | 'deleted';
}

export interface Category {
  id: number;
  uuid: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'system';
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  syncState: 'synced' | 'pending' | 'deleted';
}

export interface Transaction {
  id: number;
  uuid: string;
  title: string;
  notes: string;
  amount: number;
  type: 'expense' | 'income' | 'transfer' | 'balance_correction';
  accountId: number;
  accountUuid: string;
  toAccountId: number | null;
  toAccountUuid: string | null;
  categoryId: number | null;
  categoryUuid: string | null;
  loanId: number | null;
  loanUuid: string | null;
  date: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  syncState: 'synced' | 'pending' | 'deleted';
}

export interface Loan {
  id: number;
  uuid: string;
  name: string;
  type: 'borrowed' | 'lent';
  counterpartyKind: 'entity' | 'person';
  total: number;
  totalOffset: number;
  personId: number | null;
  startDate: number;
  notes: string;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  syncState: 'synced' | 'pending' | 'deleted';
}

export interface Person {
  id: number;
  uuid: string;
  name: string;
  phone: string;
  email: string;
  identification: string;
  notes: string;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  syncState: 'synced' | 'pending' | 'deleted';
}

export interface SyncMetadata {
  id: number;
  key: string;
  value: string;
}

export interface Budget {
  id: number;
  uuid: string;
  categoryId: number;
  categoryUuid: string;
  amount: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  syncState: 'synced' | 'pending' | 'deleted';
}

export interface Recurring {
  id: number;
  uuid: string;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  accountId: number;
  accountUuid: string;
  categoryId: number | null;
  categoryUuid: string | null;
  personId: number | null;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  nextRun: number;
  lastRun: number | null;
  leadDays: number;
  notify: boolean;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  syncState: 'synced' | 'pending' | 'deleted';
}

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('cajita.db');
    initSchema();
  }
  return db;
}

function initSchema(): void {
  const database = db!;
  database.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'bank',
      currency TEXT NOT NULL DEFAULT 'COP',
      creditLimit REAL,
      color TEXT NOT NULL DEFAULT '#4F6D7A',
      icon TEXT NOT NULL DEFAULT 'wallet',
      isPrimary INTEGER NOT NULL DEFAULT 0,
      maturityDate INTEGER,
      expectedYield REAL,
      linkedAccountId INTEGER,
      excludeFromTotals INTEGER NOT NULL DEFAULT 0,
      isArchived INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER,
      syncState TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL DEFAULT 'tag',
      color TEXT NOT NULL DEFAULT '#6A8D92',
      type TEXT NOT NULL DEFAULT 'expense',
      isArchived INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER,
      syncState TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'expense',
      accountId INTEGER NOT NULL REFERENCES accounts(id),
      accountUuid TEXT NOT NULL,
      toAccountId INTEGER REFERENCES accounts(id),
      toAccountUuid TEXT,
      categoryId INTEGER REFERENCES categories(id),
      categoryUuid TEXT,
      loanId INTEGER REFERENCES loans(id),
      loanUuid TEXT,
      date INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER,
      syncState TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      identification TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      isArchived INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER,
      syncState TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'borrowed',
      counterpartyKind TEXT NOT NULL DEFAULT 'entity',
      total REAL NOT NULL DEFAULT 0,
      totalOffset REAL NOT NULL DEFAULT 0,
      personId INTEGER REFERENCES people(id),
      startDate INTEGER NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      isArchived INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER,
      syncState TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS sync_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      categoryId INTEGER NOT NULL REFERENCES categories(id),
      categoryUuid TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER,
      syncState TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS recurring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'expense',
      accountId INTEGER NOT NULL REFERENCES accounts(id),
      accountUuid TEXT NOT NULL,
      categoryId INTEGER REFERENCES categories(id),
      categoryUuid TEXT,
      personId INTEGER REFERENCES people(id),
      frequency TEXT NOT NULL DEFAULT 'monthly',
      nextRun INTEGER NOT NULL,
      lastRun INTEGER,
      leadDays INTEGER NOT NULL DEFAULT 3,
      notify INTEGER NOT NULL DEFAULT 1,
      isArchived INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER,
      syncState TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(accountId);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_sync ON transactions(syncState);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(categoryId);
  `);

  // Migraciones seguras para bases de datos que ya existían sin estas columnas.
  const ensureColumn = (table: string, column: string, ddl: string) => {
    const cols = database.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
    if (!cols.some((c) => c.name === column)) {
      database.execSync(`ALTER TABLE ${table} ADD COLUMN ${ddl};`);
    }
  };
  ensureColumn('loans', 'personId', 'personId INTEGER REFERENCES people(id)');
  ensureColumn('people', 'email', "email TEXT NOT NULL DEFAULT ''");
  ensureColumn('recurring', 'personId', 'personId INTEGER REFERENCES people(id)');
  ensureColumn('recurring', 'leadDays', 'leadDays INTEGER NOT NULL DEFAULT 3');
  ensureColumn('recurring', 'notify', 'notify INTEGER NOT NULL DEFAULT 1');
  ensureColumn('accounts', 'isPrimary', 'isPrimary INTEGER NOT NULL DEFAULT 0');
  ensureColumn('accounts', 'maturityDate', 'maturityDate INTEGER');
  ensureColumn('accounts', 'expectedYield', 'expectedYield REAL');
  ensureColumn('accounts', 'linkedAccountId', 'linkedAccountId INTEGER');
  ensureColumn('accounts', 'excludeFromTotals', 'excludeFromTotals INTEGER NOT NULL DEFAULT 0');
  ensureColumn('loans', 'counterpartyKind', "counterpartyKind TEXT NOT NULL DEFAULT 'entity'");
}

export function now(): number {
  return Date.now();
}

export function genUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Convención de signos: `amount` guarda el efecto neto sobre la cuenta primaria
 * (`accountId`). Gasto y salida de transferencia son negativos; ingreso, corrección
 * y entrada de transferencia son positivos. El saldo es la simple suma.
 */
export function accountBalance(accountId: number): number {
  const database = getDb();
  const row = database.getFirstSync<{ balance: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS balance
     FROM transactions
     WHERE deletedAt IS NULL AND accountId = ?`,
    [accountId],
  );
  return row?.balance ?? 0;
}

export function loanBalance(loanId: number): number {
  const database = getDb();
  const loan = database.getFirstSync<Loan>('SELECT * FROM loans WHERE id = ?', [loanId]);
  if (!loan) return 0;
  const tx = database.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions WHERE deletedAt IS NULL AND loanId = ?`,
    [loanId],
  );
  const flow = tx?.total ?? 0;
  // borrowed: pagos son gastos (amount negativo) -> reducen la deuda.
  // lent: reembolsos son ingresos (amount positivo) -> reducen lo que te deben.
  if (loan.type === 'borrowed') return loan.total + loan.totalOffset + flow;
  return loan.total + loan.totalOffset - flow;
}

export interface CategorySpend {
  categoryId: number | null;
  name: string;
  color: string;
  icon: string;
  total: number;
}

export function spendingByCategory(from: number, to: number, kind: 'expense' | 'income' = 'expense'): CategorySpend[] {
  const database = getDb();
  return database.getAllSync<CategorySpend>(
    `SELECT t.categoryId AS categoryId,
            COALESCE(c.name, 'Sin categoría') AS name,
            COALESCE(c.color, '#6B7280') AS color,
            COALESCE(c.icon, 'pricetag') AS icon,
            SUM(ABS(t.amount)) AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.categoryId
     WHERE t.deletedAt IS NULL AND t.type = ? AND t.date BETWEEN ? AND ?
     GROUP BY t.categoryId
     ORDER BY total DESC`,
    [kind, from, to],
  );
}

export function monthlySeries(months: number): { label: string; income: number; expense: number; start: number }[] {
  const out: { label: string; income: number; expense: number; start: number }[] = [];
  const database = getDb();
  const base = new Date();
  base.setDate(1);
  base.setHours(0, 0, 0, 0);
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(base.getFullYear(), base.getMonth() - i, 1).getTime();
    const end = new Date(base.getFullYear(), base.getMonth() - i + 1, 1).getTime() - 1;
    const row = database.getFirstSync<{ inc: number; exp: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS inc,
         COALESCE(SUM(CASE WHEN type='expense' THEN ABS(amount) ELSE 0 END),0) AS exp
       FROM transactions WHERE deletedAt IS NULL AND date BETWEEN ? AND ?`,
      [start, end],
    );
    out.push({
      label: new Date(start).toLocaleDateString('es-CO', { month: 'short' }),
      income: row?.inc ?? 0,
      expense: row?.exp ?? 0,
      start,
    });
  }
  return out;
}

export function monthRange(monthStartDay = 1, ref = Date.now()): { from: number; to: number } {
  const d = new Date(ref);
  let start: Date;
  if (d.getDate() >= monthStartDay) {
    start = new Date(d.getFullYear(), d.getMonth(), monthStartDay);
  } else {
    start = new Date(d.getFullYear(), d.getMonth() - 1, monthStartDay);
  }
  const end = new Date(start.getFullYear(), start.getMonth() + 1, monthStartDay);
  return { from: start.getTime(), to: end.getTime() - 1 };
}