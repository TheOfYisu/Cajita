import { getDb, Category, now, genUuid } from '../db/database';
import type { SQLiteBindParams } from 'expo-sqlite';

export function getCategories(includeArchived = false): Category[] {
  const database = getDb();
  const q = includeArchived
    ? `SELECT * FROM categories WHERE deletedAt IS NULL ORDER BY name`
    : `SELECT * FROM categories WHERE deletedAt IS NULL AND isArchived = 0 ORDER BY name`;
  return database.getAllSync<Category>(q);
}

export function getCategory(id: number): Category | null {
  return getDb().getFirstSync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
}

export function createCategory(input: {
  name: string;
  icon?: string;
  color?: string;
  type?: Category['type'];
}): Category {
  const database = getDb();
  const t = now();
  const uuid = genUuid();
  database.runSync(
    `INSERT INTO categories (uuid, name, icon, color, type, isArchived, createdAt, updatedAt, syncState)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'pending')`,
    [uuid, input.name, input.icon ?? 'tag', input.color ?? '#6A8D92', input.type ?? 'expense', t, t],
  );
  const row = database.getFirstSync<Category>('SELECT * FROM categories WHERE uuid = ?', [uuid]);
  return row!;
}

export function ensureCategory(input: {
  name: string;
  icon?: string;
  color?: string;
  type?: Category['type'];
}): Category {
  const database = getDb();
  const existing = database.getFirstSync<Category>('SELECT * FROM categories WHERE name = ? AND deletedAt IS NULL', [input.name]);
  if (existing) return existing;
  return createCategory(input);
}

export function updateCategory(id: number, input: Partial<Category>): void {
  const database = getDb();
  const t = now();
  const sets: string[] = [];
  const values: SQLiteBindParams = [];
  const allowed = ['name', 'icon', 'color', 'type', 'isArchived'] as const;
  for (const k of allowed) {
    if (input[k] !== undefined) {
      sets.push(`${k} = ?`);
      values.push(input[k]);
    }
  }
  sets.push('updatedAt = ?', 'syncState = ?');
  values.push(t, 'pending', id);
  database.runSync(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, values);
}

export function deleteCategory(id: number): void {
  const database = getDb();
  const t = now();
  database.runSync(
    `UPDATE categories SET deletedAt = ?, updatedAt = ?, syncState = 'deleted' WHERE id = ?`,
    [t, t, id],
  );
}

export const DEFAULT_CATEGORIES: { name: string; icon: string; color: string; type: Category['type'] }[] = [
  { name: 'Compras', icon: 'cart', color: '#E07A5F', type: 'expense' },
  { name: 'Servicios Publicos', icon: 'receipt', color: '#3D5A80', type: 'expense' },
  { name: 'Telecomunicaciones', icon: 'call', color: '#98C1D9', type: 'expense' },
  { name: 'Seguridad Social', icon: 'shield-checkmark', color: '#8D99AE', type: 'expense' },
  { name: 'Educacion', icon: 'book', color: '#6A8D92', type: 'expense' },
  { name: 'Transporte', icon: 'car', color: '#E9C46A', type: 'expense' },
  { name: 'Entretenimiento', icon: 'game-controller', color: '#F4A261', type: 'expense' },
  { name: 'Salud', icon: 'heart', color: '#E76F51', type: 'expense' },
  { name: 'Suscripciones', icon: 'repeat', color: '#2A9D8F', type: 'expense' },
  { name: 'Gimnasio', icon: 'fitness', color: '#457B9D', type: 'expense' },
  { name: 'Comida', icon: 'restaurant', color: '#D90429', type: 'expense' },
  { name: 'Financiero', icon: 'business', color: '#5E548E', type: 'expense' },
  { name: 'Efectivo', icon: 'cash', color: '#606C38', type: 'expense' },
  { name: 'Gobierno', icon: 'business', color: '#495057', type: 'expense' },
  { name: 'Otros', icon: 'ellipsis-horizontal', color: '#6C757D', type: 'expense' },
  { name: 'Nomina', icon: 'briefcase', color: '#2A9D8F', type: 'income' },
  { name: 'Honorarios', icon: 'document-text', color: '#3A86FF', type: 'income' },
  { name: 'Transferencias', icon: 'swap-horizontal', color: '#8338EC', type: 'expense' },
  { name: 'Intereses', icon: 'percent', color: '#FF006E', type: 'expense' },
  { name: 'Balance Inicial', icon: 'flag', color: '#FB8500', type: 'system' },
];

export function seedDefaultCategories(): void {
  const database = getDb();
  const count = database.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM categories');
  if ((count?.n ?? 0) > 0) return;
  for (const c of DEFAULT_CATEGORIES) {
    createCategory(c);
  }
}