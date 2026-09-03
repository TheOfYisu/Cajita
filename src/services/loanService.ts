import { getDb, Loan, now, genUuid, loanBalance } from '../db/database';
import type { SQLiteBindParams } from 'expo-sqlite';

export function getLoans(includeArchived = false): Loan[] {
  const database = getDb();
  const q = includeArchived
    ? `SELECT * FROM loans WHERE deletedAt IS NULL ORDER BY name`
    : `SELECT * FROM loans WHERE deletedAt IS NULL AND isArchived = 0 ORDER BY name`;
  return database.getAllSync<Loan>(q);
}

export function getLoan(id: number): Loan | null {
  const database = getDb();
  return database.getFirstSync<Loan>('SELECT * FROM loans WHERE id = ?', [id]);
}

export function createLoan(input: {
  name: string;
  type?: Loan['type'];
  counterpartyKind?: Loan['counterpartyKind'];
  total?: number;
  totalOffset?: number;
  personId?: number | null;
  startDate?: number;
  notes?: string;
}): Loan {
  const database = getDb();
  const t = now();
  const uuid = genUuid();
  const kind = input.counterpartyKind ?? (input.personId ? 'person' : 'entity');
  database.runSync(
    `INSERT INTO loans (uuid, name, type, counterpartyKind, total, totalOffset, personId, startDate, notes, isArchived, createdAt, updatedAt, syncState)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending')`,
    [uuid, input.name, input.type ?? 'borrowed', kind, input.total ?? 0, input.totalOffset ?? 0,
     input.personId ?? null, input.startDate ?? t, input.notes ?? '', t, t],
  );
  const row = database.getFirstSync<Loan>('SELECT * FROM loans WHERE uuid = ?', [uuid]);
  return row!;
}

export function updateLoan(id: number, input: Partial<Loan>): void {
  const database = getDb();
  const t = now();
  const sets: string[] = [];
  const values: SQLiteBindParams = [];
  const allowed = ['name', 'type', 'counterpartyKind', 'total', 'totalOffset', 'personId', 'startDate', 'notes', 'isArchived'] as const;
  for (const k of allowed) {
    if (input[k] !== undefined) {
      sets.push(`${k} = ?`);
      values.push(input[k]);
    }
  }
  sets.push('updatedAt = ?', 'syncState = ?');
  values.push(t, 'pending', id);
  database.runSync(`UPDATE loans SET ${sets.join(', ')} WHERE id = ?`, values);
}

export function deleteLoan(id: number): void {
  const database = getDb();
  const t = now();
  database.runSync(
    `UPDATE loans SET deletedAt = ?, updatedAt = ?, syncState = 'deleted' WHERE id = ?`,
    [t, t, id],
  );
}

export function getLoanBalance(id: number): number {
  return loanBalance(id);
}

export { loanBalance };