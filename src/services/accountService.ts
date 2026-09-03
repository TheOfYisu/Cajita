import { getDb, Account, now, genUuid, accountBalance } from '../db/database';
import type { SQLiteBindParams } from 'expo-sqlite';
import { createTransfer, createTransaction } from './transactionService';
import { ensureCategory } from './categoryService';

export function getAccounts(includeArchived = false): Account[] {
  const database = getDb();
  const q = includeArchived
    ? `SELECT * FROM accounts WHERE deletedAt IS NULL ORDER BY isPrimary DESC, name`
    : `SELECT * FROM accounts WHERE deletedAt IS NULL AND isArchived = 0 ORDER BY isPrimary DESC, name`;
  return database.getAllSync<Account>(q);
}

export function getAccount(id: number): Account | null {
  const database = getDb();
  return database.getFirstSync<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
}

export function getPrimaryAccount(): Account | null {
  const database = getDb();
  return (
    database.getFirstSync<Account>(
      `SELECT * FROM accounts WHERE deletedAt IS NULL AND isArchived = 0 AND isPrimary = 1`,
    ) ??
    database.getFirstSync<Account>(
      `SELECT * FROM accounts WHERE deletedAt IS NULL AND isArchived = 0 AND type IN ('savings','bank')
       ORDER BY type = 'savings' DESC, name LIMIT 1`,
    )
  );
}

export function setPrimaryAccount(id: number): void {
  const database = getDb();
  const t = now();
  database.runSync(`UPDATE accounts SET isPrimary = 0, updatedAt = ?, syncState = 'pending' WHERE isPrimary = 1`, [t]);
  database.runSync(`UPDATE accounts SET isPrimary = 1, updatedAt = ?, syncState = 'pending' WHERE id = ?`, [t, id]);
}

export function createAccount(input: {
  name: string;
  type: Account['type'];
  currency?: string;
  creditLimit?: number | null;
  color?: string;
  icon?: string;
  isPrimary?: boolean;
  maturityDate?: number | null;
  expectedYield?: number | null;
  linkedAccountId?: number | null;
  excludeFromTotals?: boolean;
}): Account {
  const database = getDb();
  const t = now();
  const uuid = genUuid();
  database.runSync(
    `INSERT INTO accounts (uuid, name, type, currency, creditLimit, color, icon, isPrimary, maturityDate, expectedYield, linkedAccountId, excludeFromTotals, isArchived, createdAt, updatedAt, syncState)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending')`,
    [uuid, input.name, input.type, input.currency ?? 'COP', input.creditLimit ?? null,
     input.color ?? '#4F6D7A', input.icon ?? 'wallet', input.isPrimary ? 1 : 0,
     input.maturityDate ?? null, input.expectedYield ?? null, input.linkedAccountId ?? null,
     input.excludeFromTotals ? 1 : 0, t, t],
  );
  const row = database.getFirstSync<Account>('SELECT * FROM accounts WHERE uuid = ?', [uuid])!;
  if (input.isPrimary) setPrimaryAccount(row.id);
  return row;
}

export function updateAccount(id: number, input: Partial<Account>): void {
  const database = getDb();
  const t = now();
  const sets: string[] = [];
  const values: SQLiteBindParams = [];
  const allowed = ['name', 'type', 'currency', 'creditLimit', 'color', 'icon', 'maturityDate', 'expectedYield', 'linkedAccountId', 'excludeFromTotals', 'isPrimary', 'isArchived'] as const;
  for (const k of allowed) {
    if (input[k] !== undefined) {
      sets.push(`${k} = ?`);
      values.push(typeof input[k] === 'boolean' ? (input[k] ? 1 : 0) : (input[k] as never));
    }
  }
  if (sets.length) {
    sets.push('updatedAt = ?', "syncState = 'pending'");
    values.push(t, id);
    database.runSync(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?`, values);
  }
  if (input.isPrimary) setPrimaryAccount(id);
}

export function deleteAccount(id: number): void {
  const database = getDb();
  const t = now();
  database.runSync(
    `UPDATE accounts SET deletedAt = ?, updatedAt = ?, syncState = 'deleted' WHERE id = ?`,
    [t, t, id],
  );
}

/**
 * Cierra un CDT: registra el rendimiento como ingreso, transfiere el total
 * (capital + rendimiento) a la cuenta principal (o la indicada) y archiva el CDT.
 */
export function closeCdt(cdtId: number, toAccountId?: number): { moved: number; yield: number } | null {
  const database = getDb();
  const cdt = getAccount(cdtId);
  if (!cdt) return null;
  const target = toAccountId
    ? getAccount(toAccountId)
    : (cdt.linkedAccountId ? getAccount(cdt.linkedAccountId) : null) ?? getPrimaryAccount();
  if (!target || target.id === cdt.id) return null;

  const yieldAmount = cdt.expectedYield ?? 0;
  const t = now();

  if (yieldAmount > 0) {
    const cat = ensureCategory({ name: 'Intereses', type: 'income', icon: 'trending-up', color: '#1FA971' });
    createTransaction({
      title: `Rendimiento ${cdt.name}`,
      amount: yieldAmount,
      type: 'income',
      accountId: cdt.id,
      accountUuid: cdt.uuid,
      categoryId: cat.id,
      categoryUuid: cat.uuid,
      date: t,
    });
  }

  const moveAmount = accountBalance(cdt.id);
  if (moveAmount > 0) {
    createTransfer({
      title: `Cierre CDT → ${target.name}`,
      amount: moveAmount,
      fromAccountId: cdt.id,
      fromAccountUuid: cdt.uuid,
      toAccountId: target.id,
      toAccountUuid: target.uuid,
      date: t,
    });
  }

  database.runSync(
    `UPDATE accounts SET isArchived = 1, updatedAt = ?, syncState = 'pending' WHERE id = ?`,
    [t, cdt.id],
  );
  return { moved: moveAmount, yield: yieldAmount };
}

export function accountTypeLabel(type: Account['type']): string {
  switch (type) {
    case 'bank': return 'Banco';
    case 'cash': return 'Efectivo';
    case 'credit_card': return 'Tarjeta de crédito';
    case 'savings': return 'Ahorro';
    case 'cajita': return 'Bolsillo';
    case 'cdt': return 'CDT';
    case 'debt': return 'Deuda';
    case 'loan': return 'Préstamo';
    default: return 'Cuenta';
  }
}
