import { getDb, Budget, now, genUuid, monthRange } from '../db/database';

export function getBudgets(): Budget[] {
  return getDb().getAllSync<Budget>(
    `SELECT * FROM budgets WHERE deletedAt IS NULL ORDER BY id`,
  );
}

export function setBudget(categoryId: number, categoryUuid: string, amount: number): void {
  const db = getDb();
  const t = now();
  const existing = db.getFirstSync<Budget>(
    'SELECT * FROM budgets WHERE categoryId = ? AND deletedAt IS NULL',
    [categoryId],
  );
  if (amount <= 0) {
    if (existing) {
      db.runSync(`UPDATE budgets SET deletedAt = ?, updatedAt = ?, syncState = 'deleted' WHERE id = ?`, [t, t, existing.id]);
    }
    return;
  }
  if (existing) {
    db.runSync(`UPDATE budgets SET amount = ?, updatedAt = ?, syncState = 'pending' WHERE id = ?`, [amount, t, existing.id]);
  } else {
    db.runSync(
      `INSERT INTO budgets (uuid, categoryId, categoryUuid, amount, createdAt, updatedAt, syncState)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [genUuid(), categoryId, categoryUuid, amount, t, t],
    );
  }
}

export interface BudgetProgress {
  categoryId: number;
  name: string;
  color: string;
  icon: string;
  budget: number;
  spent: number;
  pct: number;
}

export function getBudgetProgress(monthStartDay = 1): BudgetProgress[] {
  const db = getDb();
  const { from, to } = monthRange(monthStartDay);
  const rows = db.getAllSync<{
    categoryId: number;
    name: string;
    color: string;
    icon: string;
    budget: number;
  }>(
    `SELECT b.categoryId AS categoryId, c.name AS name, c.color AS color, c.icon AS icon, b.amount AS budget
     FROM budgets b JOIN categories c ON c.id = b.categoryId
     WHERE b.deletedAt IS NULL ORDER BY c.name`,
  );
  return rows.map((r) => {
    const spent =
      db.getFirstSync<{ s: number }>(
        `SELECT COALESCE(SUM(ABS(amount)),0) AS s FROM transactions
         WHERE deletedAt IS NULL AND type='expense' AND categoryId = ? AND date BETWEEN ? AND ?`,
        [r.categoryId, from, to],
      )?.s ?? 0;
    return { ...r, spent, pct: r.budget > 0 ? spent / r.budget : 0 };
  });
}
