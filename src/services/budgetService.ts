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
  return db.getAllSync<BudgetProgress>(
    `SELECT b.categoryId AS categoryId,
            c.name AS name,
            c.color AS color,
            c.icon AS icon,
            b.amount AS budget,
            COALESCE(SUM(ABS(t.amount)), 0) AS spent,
            CASE WHEN b.amount > 0 THEN ROUND(COALESCE(SUM(ABS(t.amount)), 0) * 1.0 / b.amount, 4) ELSE 0 END AS pct
     FROM budgets b
     JOIN categories c ON c.id = b.categoryId
     LEFT JOIN transactions t ON t.categoryId = b.categoryId
                              AND t.deletedAt IS NULL
                              AND t.type = 'expense'
                              AND t.date BETWEEN ? AND ?
     WHERE b.deletedAt IS NULL
     GROUP BY b.categoryId, c.name, c.color, c.icon, b.amount
     ORDER BY c.name`,
    [from, to],
  );
}
